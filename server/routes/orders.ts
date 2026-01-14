import { Router } from 'express'
import { getDb } from '../db.js'
import { adminAuth } from '../middleware/auth.js'

const router = Router()

// Apply admin auth to all routes
router.use(adminAuth)

// Get all orders
router.get('/', (req, res) => {
  const db = getDb()
  const status = req.query.status as string | undefined

  let query = `
    SELECT o.*,
      (SELECT COUNT(*) FROM attendees WHERE order_id = o.id) as attendee_count,
      (SELECT COUNT(*) FROM attendees WHERE order_id = o.id AND name IS NOT NULL AND name != '') as names_collected
    FROM orders o
  `

  if (status) {
    query += ` WHERE o.status = ?`
  }

  query += ` ORDER BY o.created_at DESC`

  const orders = status
    ? db.prepare(query).all(status)
    : db.prepare(query).all()

  res.json(orders)
})

// Get single order with items and attendees
router.get('/:id', (req, res) => {
  const db = getDb()

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const items = db.prepare(`
    SELECT oi.*, p.name as product_name, p.category
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(req.params.id)

  const attendees = db.prepare(`
    SELECT a.*, t.name as table_name
    FROM attendees a
    LEFT JOIN tables t ON a.table_id = t.id
    WHERE a.order_id = ?
  `).all(req.params.id)

  const raffleEntries = db.prepare(`
    SELECT re.*, p.name as product_name
    FROM raffle_entries re
    JOIN products p ON re.product_id = p.id
    WHERE re.order_id = ?
    ORDER BY re.entry_number
  `).all(req.params.id)

  res.json({
    ...order,
    items,
    attendees,
    raffleEntries,
  })
})

// Update order notes
router.patch('/:id', (req, res) => {
  const db = getDb()
  const { notes } = req.body

  db.prepare('UPDATE orders SET notes = ? WHERE id = ?').run(notes, req.params.id)

  res.json({ success: true })
})

// Cancel order
router.post('/:id/cancel', (req, res) => {
  const db = getDb()

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  if (order.status === 'paid') {
    return res.status(400).json({ error: 'Cannot cancel paid order - use refund instead' })
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', req.params.id)

  res.json({ success: true })
})

export default router
