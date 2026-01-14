import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { getDb, generateId } from '../db.js'

const router = Router()

// Lazy initialize Stripe to ensure env vars are loaded
let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripe
}

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (webhookSecret) {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret)
    } else {
      // For development without webhook secret
      event = JSON.parse(req.body.toString()) as Stripe.Event
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    await handleSuccessfulPayment(session)
  }

  res.json({ received: true })
})

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const db = getDb()
  const orderId = session.metadata?.order_id

  if (!orderId) {
    console.error('No order_id in session metadata')
    return
  }

  // Update order status
  db.prepare(`
    UPDATE orders
    SET status = 'paid',
        stripe_payment_intent = ?,
        paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(session.payment_intent, orderId)

  // Get order details
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
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
      // Determine entries based on product name/price
      // 1/$25, 5/$100, 12/$200
      let entriesPerUnit = 1
      if (item.unit_price_cents === 10000) entriesPerUnit = 5      // $100 = 5 entries
      else if (item.unit_price_cents === 20000) entriesPerUnit = 12 // $200 = 12 entries

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

  console.log(`Order ${orderId} completed: ${attendeeCount} attendees, ${nextEntry - raffleEntryNumber.next} raffle entries`)
}

export default router
