import { Router } from 'express'
import Stripe from 'stripe'
import { getDb, generateId } from '../db.js'
import { sendPurchaseReceipt, sendAdminNotification } from '../services/email.js'

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

interface CartItem {
  productId: string
  quantity: number
}

interface AttendeeInput {
  name?: string
  dietary?: string
}

interface CheckoutRequest {
  items: CartItem[]
  customerEmail: string
  customerName?: string
  customerPhone?: string
  customerAddress?: string
  donationCents?: number
  paymentMethod?: 'card' | 'check'
  attendees?: AttendeeInput[]
}

router.post('/', async (req, res) => {
  try {
    const {
      items,
      customerEmail,
      customerName,
      customerPhone,
      customerAddress,
      donationCents = 0,
      paymentMethod = 'card',
      attendees
    }: CheckoutRequest = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' })
    }

    if (!customerEmail) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Require address for check payments
    if (paymentMethod === 'check' && !customerAddress) {
      return res.status(400).json({ error: 'Mailing address is required for check payments' })
    }

    const db = getDb()

    // Build line items for Stripe (only needed for card payments)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let subtotalCents = 0
    const orderItems: Array<{ productId: string; quantity: number; unitPriceCents: number; totalCents: number }> = []

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.productId) as any

      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` })
      }

      // Check availability
      if (product.quantity_available !== null) {
        const remaining = product.quantity_available - product.quantity_sold
        if (item.quantity > remaining) {
          return res.status(400).json({ error: `Only ${remaining} ${product.name} available` })
        }
      }

      const itemTotal = product.price_cents * item.quantity
      subtotalCents += itemTotal

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPriceCents: product.price_cents,
        totalCents: itemTotal,
      })

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description || undefined,
          },
          unit_amount: product.price_cents,
        },
        quantity: item.quantity,
      })
    }

    // Add donation as a line item if present
    if (donationCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Additional Donation',
            description: 'Thank you for your generous support!',
          },
          unit_amount: donationCents,
        },
        quantity: 1,
      })
    }

    const totalCents = subtotalCents + donationCents

    // Create order in database
    const orderId = generateId()
    const status = paymentMethod === 'check' ? 'pending_check' : 'pending'
    const attendeeDataJson = attendees ? JSON.stringify(attendees) : null

    db.prepare(`
      INSERT INTO orders (id, customer_email, customer_name, customer_phone, customer_address, subtotal_cents, total_cents, donation_cents, payment_method, status, attendee_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, customerEmail, customerName || null, customerPhone || null, customerAddress || null, subtotalCents, totalCents, donationCents, paymentMethod, status, attendeeDataJson)

    // Create order items
    for (const item of orderItems) {
      db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents, total_cents)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(generateId(), orderId, item.productId, item.quantity, item.unitPriceCents, item.totalCents)
    }

    // Handle check payment - skip Stripe, redirect to confirmation
    if (paymentMethod === 'check') {
      // Send receipt email for check orders (async, don't block response)
      const orderForEmail = {
        id: orderId,
        customer_email: customerEmail,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        total_cents: totalCents,
        donation_cents: donationCents,
        payment_method: 'check' as const,
        items: await Promise.all(orderItems.map(async (item) => {
          const product = db.prepare('SELECT name, category FROM products WHERE id = ?').get(item.productId) as any
          return {
            product_name: product.name,
            quantity: item.quantity,
            unit_price_cents: item.unitPriceCents,
            category: product.category,
          }
        })),
      }

      // Send emails in background (don't await)
      sendPurchaseReceipt(orderForEmail).catch(err => console.error('Failed to send receipt:', err))
      sendAdminNotification(orderForEmail).catch(err => console.error('Failed to send admin notification:', err))

      res.json({
        orderId,
        redirectUrl: `/check-confirmation?order_id=${orderId}`,
      })
      return
    }

    // Card payment - create Stripe checkout session
    const baseUrl = process.env.BASE_URL
    if (!baseUrl) {
      throw new Error('BASE_URL environment variable is required')
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel?order_id=${orderId}`,
      metadata: {
        order_id: orderId,
      },
    })

    // Update order with Stripe session ID
    db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId)

    res.json({
      sessionId: session.id,
      sessionUrl: session.url,
      orderId,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    res.status(500).json({ error: 'Checkout failed' })
  }
})

export default router
