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

// Manually complete order (for test mode - simulates webhook)
router.post('/:id/complete', (req, res) => {
  const db = getDb()
  const orderId = req.params.id

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  if (order.status === 'paid') {
    return res.status(400).json({ error: 'Order is already paid' })
  }

  // Update order status to paid
  db.prepare(`
    UPDATE orders
    SET status = 'paid',
        paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(orderId)

  // Get order items
  const orderItems = db.prepare(`
    SELECT oi.*, p.category, p.table_size, p.name as product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(orderId) as any[]

  // Update product quantities sold
  for (const item of orderItems) {
    db.prepare('UPDATE products SET quantity_sold = quantity_sold + ? WHERE id = ?')
      .run(item.quantity, item.product_id)
  }

  // Create attendee records for ticket/sponsorship purchases
  const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  let attendeeCount = 0
  for (const item of orderItems) {
    if (item.category === 'ticket' || item.category === 'sponsorship') {
      const seatsPerUnit = item.table_size || 1
      const totalSeats = item.quantity * seatsPerUnit

      for (let i = 0; i < totalSeats; i++) {
        db.prepare(`
          INSERT INTO attendees (id, order_id, created_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(generateId(), orderId)
        attendeeCount++
      }
    }
  }

  // Create raffle entries
  let raffleEntryNumber = db.prepare('SELECT COALESCE(MAX(entry_number), 0) + 1 as next FROM raffle_entries').get() as any
  let nextEntry = raffleEntryNumber.next

  for (const item of orderItems) {
    if (item.category === 'raffle') {
      let entriesPerUnit = 1
      if (item.unit_price_cents === 10000) entriesPerUnit = 5
      else if (item.unit_price_cents === 20000) entriesPerUnit = 12

      const totalEntries = item.quantity * entriesPerUnit

      for (let i = 0; i < totalEntries; i++) {
        db.prepare(`
          INSERT INTO raffle_entries (id, order_id, product_id, entry_number, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(generateId(), orderId, item.product_id, nextEntry++)
      }
    }
  }

  // Update or create donor record
  const existingDonor = db.prepare('SELECT * FROM donors WHERE email = ?').get(order.customer_email) as any

  if (existingDonor) {
    db.prepare(`
      UPDATE donors
      SET total_donated_cents = total_donated_cents + ?,
          order_count = order_count + 1,
          last_order_at = CURRENT_TIMESTAMP,
          name = COALESCE(?, name)
      WHERE email = ?
    `).run(order.total_cents, order.customer_name, order.customer_email)
  } else {
    db.prepare(`
      INSERT INTO donors (id, email, name, phone, total_donated_cents, order_count, first_order_at, last_order_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(generateId(), order.customer_email, order.customer_name, order.customer_phone, order.total_cents)
  }

  console.log(`Order ${orderId} manually completed: ${attendeeCount} attendees, ${nextEntry - raffleEntryNumber.next} raffle entries`)

  res.json({ success: true, attendeeCount, raffleEntries: nextEntry - raffleEntryNumber.next })
})

export default router
