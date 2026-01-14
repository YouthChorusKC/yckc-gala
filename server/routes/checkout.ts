import { Router } from 'express'
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

interface CartItem {
  productId: string
  quantity: number
}

interface CheckoutRequest {
  items: CartItem[]
  customerEmail: string
  customerName?: string
  customerPhone?: string
  donationCents?: number
}

router.post('/', async (req, res) => {
  try {
    const { items, customerEmail, customerName, customerPhone, donationCents = 0 }: CheckoutRequest = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' })
    }

    if (!customerEmail) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const db = getDb()

    // Build line items for Stripe
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

    // Create order in database (pending status)
    const orderId = generateId()

    db.prepare(`
      INSERT INTO orders (id, customer_email, customer_name, customer_phone, subtotal_cents, total_cents, donation_cents, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(orderId, customerEmail, customerName || null, customerPhone || null, subtotalCents, totalCents, donationCents)

    // Create order items
    for (const item of orderItems) {
      db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents, total_cents)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(generateId(), orderId, item.productId, item.quantity, item.unitPriceCents, item.totalCents)
    }

    // Create Stripe checkout session
    const baseUrl = process.env.BASE_URL || 'http://localhost:3052'

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
