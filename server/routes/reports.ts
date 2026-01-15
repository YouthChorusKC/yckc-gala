import { Router } from 'express'
import { getDb } from '../db.js'
import { adminAuth } from '../middleware/auth.js'

const router = Router()

router.use(adminAuth)

// Dashboard summary
router.get('/summary', (req, res) => {
  const db = getDb()

  // Order counts by status
  const orderStats = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN status = 'pending_check' THEN 1 ELSE 0 END) as pending_check_orders,
      SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END) as total_revenue,
      SUM(CASE WHEN status = 'paid' THEN donation_cents ELSE 0 END) as total_donations
    FROM orders
  `).get() as any

  // Revenue breakdown by category
  const categoryRevenue = db.prepare(`
    SELECT
      p.category,
      SUM(CASE WHEN o.status = 'paid' THEN oi.total_cents ELSE 0 END) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    GROUP BY p.category
  `).all() as any[]

  const revenueByCategory: Record<string, number> = {}
  for (const row of categoryRevenue) {
    revenueByCategory[row.category] = row.revenue || 0
  }

  const attendees = db.prepare(`
    SELECT
      COUNT(*) as total_attendees,
      SUM(CASE WHEN name IS NOT NULL AND name != '' THEN 1 ELSE 0 END) as names_collected,
      SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN table_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_to_table
    FROM attendees a
    JOIN orders o ON a.order_id = o.id
    WHERE o.status IN ('paid', 'pending_check')
  `).get() as any

  const raffles = db.prepare(`
    SELECT COUNT(*) as total_entries
    FROM raffle_entries re
    JOIN orders o ON re.order_id = o.id
    WHERE o.status = 'paid'
  `).get() as any

  const products = db.prepare(`
    SELECT
      p.id, p.name, p.category, p.price_cents, p.description,
      p.quantity_available, p.quantity_sold,
      SUM(CASE WHEN o.status = 'paid' THEN oi.quantity ELSE 0 END) as sold
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY p.category, p.sort_order
  `).all()

  res.json({
    orders: {
      total: orderStats.total_orders || 0,
      paid: orderStats.paid_orders || 0,
      pending: orderStats.pending_orders || 0,
      pendingCheck: orderStats.pending_check_orders || 0,
    },
    revenue: {
      total: orderStats.total_revenue || 0,
      donations: orderStats.total_donations || 0,
      orderCount: orderStats.paid_orders || 0,
      byCategory: {
        ticket: revenueByCategory['ticket'] || 0,
        sponsorship: revenueByCategory['sponsorship'] || 0,
        raffle: revenueByCategory['raffle'] || 0,
        donation: orderStats.total_donations || 0,
      },
    },
    attendees: {
      total: attendees.total_attendees || 0,
      namesCollected: attendees.names_collected || 0,
      checkedIn: attendees.checked_in || 0,
      assigned: attendees.assigned_to_table || 0,
    },
    raffleEntries: raffles.total_entries || 0,
    products,
  })
})

// Export attendees as CSV
router.get('/export/attendees', (req, res) => {
  const db = getDb()

  const attendees = db.prepare(`
    SELECT
      a.name as "Attendee Name",
      a.email as "Attendee Email",
      a.dietary_restrictions as "Dietary Restrictions",
      t.name as "Table",
      CASE WHEN a.checked_in = 1 THEN 'Yes' ELSE 'No' END as "Checked In",
      o.customer_name as "Order Name",
      o.customer_email as "Order Email"
    FROM attendees a
    JOIN orders o ON a.order_id = o.id
    LEFT JOIN tables t ON a.table_id = t.id
    WHERE o.status = 'paid'
    ORDER BY t.name, a.name
  `).all() as any[]

  const csv = generateCSV(attendees)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=attendees.csv')
  res.send(csv)
})

// Export orders as CSV
router.get('/export/orders', (req, res) => {
  const db = getDb()

  const orders = db.prepare(`
    SELECT
      o.id as "Order ID",
      o.customer_name as "Name",
      o.customer_email as "Email",
      o.customer_phone as "Phone",
      CAST(o.total_cents / 100.0 AS TEXT) as "Total",
      CAST(o.donation_cents / 100.0 AS TEXT) as "Donation",
      o.status as "Status",
      o.created_at as "Created",
      o.paid_at as "Paid"
    FROM orders o
    ORDER BY o.created_at DESC
  `).all() as any[]

  const csv = generateCSV(orders)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=orders.csv')
  res.send(csv)
})

// Export raffle entries as CSV
router.get('/export/raffle', (req, res) => {
  const db = getDb()

  const entries = db.prepare(`
    SELECT
      re.entry_number as "Entry #",
      p.name as "Raffle Type",
      o.customer_name as "Purchaser Name",
      o.customer_email as "Purchaser Email"
    FROM raffle_entries re
    JOIN orders o ON re.order_id = o.id
    JOIN products p ON re.product_id = p.id
    WHERE o.status = 'paid'
    ORDER BY re.entry_number
  `).all() as any[]

  const csv = generateCSV(entries)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=raffle-entries.csv')
  res.send(csv)
})

// Export donors as CSV
router.get('/export/donors', (req, res) => {
  const db = getDb()

  const donors = db.prepare(`
    SELECT
      name as "Name",
      email as "Email",
      phone as "Phone",
      CAST(total_donated_cents / 100.0 AS TEXT) as "Total Donated",
      order_count as "Orders",
      first_order_at as "First Order",
      last_order_at as "Last Order"
    FROM donors
    ORDER BY total_donated_cents DESC
  `).all() as any[]

  const csv = generateCSV(donors)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=donors.csv')
  res.send(csv)
})

function generateCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

export default router
