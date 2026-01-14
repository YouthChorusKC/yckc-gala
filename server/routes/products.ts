import { Router } from 'express'
import { getDb } from '../db.js'

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

export default router
