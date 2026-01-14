import { Router } from 'express'
import { getDb } from '../db.js'
import { adminAuth } from '../middleware/auth.js'

const router = Router()

router.use(adminAuth)

// Get all attendees
router.get('/', (req, res) => {
  const db = getDb()

  const attendees = db.prepare(`
    SELECT a.*,
      o.customer_email as order_email,
      o.customer_name as order_name,
      t.name as table_name
    FROM attendees a
    JOIN orders o ON a.order_id = o.id
    LEFT JOIN tables t ON a.table_id = t.id
    WHERE o.status = 'paid'
    ORDER BY t.name, a.name
  `).all()

  res.json(attendees)
})

// Get attendees missing names
router.get('/missing-names', (req, res) => {
  const db = getDb()

  const attendees = db.prepare(`
    SELECT a.*,
      o.customer_email as order_email,
      o.customer_name as order_name,
      o.id as order_id
    FROM attendees a
    JOIN orders o ON a.order_id = o.id
    WHERE o.status = 'paid'
      AND (a.name IS NULL OR a.name = '')
    ORDER BY o.customer_email
  `).all()

  res.json(attendees)
})

// Update attendee
router.patch('/:id', (req, res) => {
  const db = getDb()
  const { name, email, dietary_restrictions, table_id } = req.body

  const updates: string[] = []
  const values: any[] = []

  if (name !== undefined) {
    updates.push('name = ?')
    values.push(name)
  }
  if (email !== undefined) {
    updates.push('email = ?')
    values.push(email)
  }
  if (dietary_restrictions !== undefined) {
    updates.push('dietary_restrictions = ?')
    values.push(dietary_restrictions)
  }
  if (table_id !== undefined) {
    updates.push('table_id = ?')
    values.push(table_id || null)
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  values.push(req.params.id)

  db.prepare(`UPDATE attendees SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  res.json({ success: true })
})

// Check in attendee
router.post('/:id/checkin', (req, res) => {
  const db = getDb()

  db.prepare(`
    UPDATE attendees
    SET checked_in = 1, checked_in_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id)

  res.json({ success: true })
})

// Undo check in
router.post('/:id/undo-checkin', (req, res) => {
  const db = getDb()

  db.prepare(`
    UPDATE attendees
    SET checked_in = 0, checked_in_at = NULL
    WHERE id = ?
  `).run(req.params.id)

  res.json({ success: true })
})

export default router
