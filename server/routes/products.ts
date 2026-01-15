import { Router } from 'express'
import { getDb } from '../db.js'
import { editAuth } from '../middleware/auth.js'

const router = Router()

// Get all active products grouped by category
router.get('/', (req, res) => {
  const db = getDb()

  const products = db.prepare(`
    SELECT * FROM products
    WHERE is_active = 1
    ORDER BY category, sort_order, price_cents
  `).all()

  // Group by category
  const grouped = {
    ticket: products.filter((p: any) => p.category === 'ticket'),
    sponsorship: products.filter((p: any) => p.category === 'sponsorship'),
    raffle: products.filter((p: any) => p.category === 'raffle'),
  }

  res.json(grouped)
})

// Get single product
router.get('/:id', (req, res) => {
  const db = getDb()
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)

  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }

  res.json(product)
})

// Update product (edit role required)
router.patch('/:id', editAuth, (req, res) => {
  const db = getDb()
  const { id } = req.params
  const { name, description, price_cents, quantity_available, is_active } = req.body

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }

  // Build update query dynamically based on provided fields
  const updates: string[] = []
  const values: any[] = []

  if (name !== undefined) {
    updates.push('name = ?')
    values.push(name)
  }
  if (description !== undefined) {
    updates.push('description = ?')
    values.push(description)
  }
  if (price_cents !== undefined) {
    updates.push('price_cents = ?')
    values.push(price_cents)
  }
  if (quantity_available !== undefined) {
    updates.push('quantity_available = ?')
    values.push(quantity_available)
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?')
    values.push(is_active ? 1 : 0)
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  values.push(id)
  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  res.json(updated)
})

export default router
