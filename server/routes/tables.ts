import { Router } from 'express'
import { getDb, generateId } from '../db.js'
import { adminAuth } from '../middleware/auth.js'

const router = Router()

router.use(adminAuth)

// Get all tables with attendee counts
router.get('/', (req, res) => {
  const db = getDb()

  const tables = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM attendees WHERE table_id = t.id) as current_count
    FROM tables t
    ORDER BY t.name
  `).all()

  res.json(tables)
})

// Get single table with attendees
router.get('/:id', (req, res) => {
  const db = getDb()

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id)

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }

  const attendees = db.prepare(`
    SELECT a.*, o.customer_email as order_email
    FROM attendees a
    JOIN orders o ON a.order_id = o.id
    WHERE a.table_id = ? AND o.status = 'paid'
    ORDER BY a.name
  `).all(req.params.id)

  res.json({ ...table, attendees })
})

// Create table
router.post('/', (req, res) => {
  const db = getDb()
  const { name, capacity = 8, is_reserved = false, notes } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Table name is required' })
  }

  const id = generateId()

  db.prepare(`
    INSERT INTO tables (id, name, capacity, is_reserved, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, capacity, is_reserved ? 1 : 0, notes || null)

  res.json({ id, name, capacity, is_reserved, notes })
})

// Update table
router.patch('/:id', (req, res) => {
  const db = getDb()
  const { name, capacity, is_reserved, notes } = req.body

  const updates: string[] = []
  const values: any[] = []

  if (name !== undefined) {
    updates.push('name = ?')
    values.push(name)
  }
  if (capacity !== undefined) {
    updates.push('capacity = ?')
    values.push(capacity)
  }
  if (is_reserved !== undefined) {
    updates.push('is_reserved = ?')
    values.push(is_reserved ? 1 : 0)
  }
  if (notes !== undefined) {
    updates.push('notes = ?')
    values.push(notes)
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  values.push(req.params.id)

  db.prepare(`UPDATE tables SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  res.json({ success: true })
})

// Delete table (only if no attendees assigned)
router.delete('/:id', (req, res) => {
  const db = getDb()

  const count = db.prepare('SELECT COUNT(*) as count FROM attendees WHERE table_id = ?').get(req.params.id) as any

  if (count.count > 0) {
    return res.status(400).json({ error: 'Cannot delete table with assigned attendees' })
  }

  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id)

  res.json({ success: true })
})

// Bulk create tables
router.post('/bulk', (req, res) => {
  const db = getDb()
  const { count, prefix = 'Table', capacity = 8 } = req.body

  if (!count || count < 1) {
    return res.status(400).json({ error: 'Count must be at least 1' })
  }

  const tables: Array<{ id: string; name: string }> = []

  for (let i = 1; i <= count; i++) {
    const id = generateId()
    const name = `${prefix} ${i}`

    db.prepare(`
      INSERT INTO tables (id, name, capacity, is_reserved)
      VALUES (?, ?, ?, 0)
    `).run(id, name, capacity)

    tables.push({ id, name })
  }

  res.json(tables)
})

export default router
