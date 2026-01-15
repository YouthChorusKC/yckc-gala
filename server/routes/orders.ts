import { Router } from 'express'
import { getDb } from '../db.js'
import { adminAuth, editAuth } from '../middleware/auth.js'
import { sendPaymentReceived, sendPurchaseReceipt, sendAdminNotification } from '../services/email.js'

const router = Router()

// PUBLIC: Get order summary for check confirmation page
router.get('/public/:id', (req, res) => {
  const db = getDb()

  const order = db.prepare(`
    SELECT id, customer_email, customer_name, total_cents, status, payment_method, created_at
    FROM orders WHERE id = ?
  `).get(req.params.id) as any

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const items = db.prepare(`
    SELECT p.name as product_name, oi.quantity, oi.total_cents
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(req.params.id)

  res.json({
    id: order.id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    totalCents: order.total_cents,
    status: order.status,
    paymentMethod: order.payment_method,
    createdAt: order.created_at,
    items,
  })
})

// Apply admin auth to all routes below
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

// Update order notes (edit role required)
router.patch('/:id', editAuth, (req, res) => {
  const db = getDb()
  const { notes } = req.body

  db.prepare('UPDATE orders SET notes = ? WHERE id = ?').run(notes, req.params.id)

  res.json({ success: true })
})

// Cancel order (edit role required)
router.post('/:id/cancel', editAuth, (req, res) => {
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

// Manually complete order (for test mode - simulates webhook, edit role required)
router.post('/:id/complete', editAuth, (req, res) => {
  const db = getDb()
  const orderId = req.params.id as string

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

  // Parse attendee data from order if available
  let attendeeData: Array<{ name?: string; dietary?: string }> = []
  if (order.attendee_data) {
    try {
      attendeeData = JSON.parse(order.attendee_data)
    } catch (e) {
      console.error('Failed to parse attendee_data:', e)
    }
  }

  let attendeeCount = 0
  let attendeeDataIndex = 0
  for (const item of orderItems) {
    if (item.category === 'ticket' || item.category === 'sponsorship') {
      const seatsPerUnit = item.table_size || 1
      const totalSeats = item.quantity * seatsPerUnit

      for (let i = 0; i < totalSeats; i++) {
        const prefilledData = attendeeData[attendeeDataIndex] || {}
        db.prepare(`
          INSERT INTO attendees (id, order_id, name, dietary_restrictions, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(generateId(), orderId, prefilledData.name || null, prefilledData.dietary || null)
        attendeeCount++
        attendeeDataIndex++
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

  // Send emails
  const orderForEmail = {
    id: orderId,
    customer_email: order.customer_email,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    total_cents: order.total_cents,
    donation_cents: order.donation_cents || 0,
    payment_method: (order.payment_method || 'card') as 'card' | 'check',
    items: orderItems.map((item: any) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      category: item.category,
    })),
  }

  // For check orders (pending_check), send payment received confirmation
  if (order.status === 'pending_check') {
    sendPaymentReceived(orderForEmail).catch(err => console.error('Failed to send payment received:', err))
  } else {
    // For card orders marked manually, send the receipt
    sendPurchaseReceipt(orderForEmail).catch(err => console.error('Failed to send receipt:', err))
    sendAdminNotification(orderForEmail).catch(err => console.error('Failed to send admin notification:', err))
  }

  res.json({ success: true, attendeeCount, raffleEntries: nextEntry - raffleEntryNumber.next })
})

export default router
