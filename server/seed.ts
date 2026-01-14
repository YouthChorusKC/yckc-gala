import { config } from 'dotenv'
config()

import { getDb, initDb, generateId } from './db.js'

// Initialize database
initDb()

const db = getDb()

// Clear existing products (for re-seeding)
db.prepare('DELETE FROM products').run()

// Seed products
const products = [
  // Tickets
  {
    id: generateId(),
    name: 'Individual Ticket',
    description: 'One seat at the YCKC Gala',
    category: 'ticket',
    price_cents: 7500, // $75
    quantity_available: null,
    table_size: 1,
    sort_order: 1,
  },
  {
    id: generateId(),
    name: 'Table of 8',
    description: 'Reserve a full table for your group',
    category: 'ticket',
    price_cents: 56000, // $700 (save $100)
    quantity_available: 20,
    table_size: 8,
    sort_order: 2,
  },

  // Sponsorship packages (examples - adjust as needed)
  {
    id: generateId(),
    name: 'Platinum Sponsor',
    description: 'Premium table + logo on program + verbal recognition + 12 raffle entries',
    category: 'sponsorship',
    price_cents: 250000, // $2,500
    quantity_available: 4,
    table_size: 8,
    sort_order: 1,
  },
  {
    id: generateId(),
    name: 'Gold Sponsor',
    description: 'Reserved table + logo on program + 8 raffle entries',
    category: 'sponsorship',
    price_cents: 150000, // $1,500
    quantity_available: 8,
    table_size: 8,
    sort_order: 2,
  },
  {
    id: generateId(),
    name: 'Silver Sponsor',
    description: 'Reserved table + name in program + 5 raffle entries',
    category: 'sponsorship',
    price_cents: 100000, // $1,000
    quantity_available: 10,
    table_size: 8,
    sort_order: 3,
  },
  {
    id: generateId(),
    name: 'Bronze Sponsor',
    description: '4 tickets + name in program',
    category: 'sponsorship',
    price_cents: 50000, // $500
    quantity_available: null,
    table_size: 4,
    sort_order: 4,
  },
  {
    id: generateId(),
    name: 'Friend of YCKC',
    description: '2 tickets + name in program',
    category: 'sponsorship',
    price_cents: 25000, // $250
    quantity_available: null,
    table_size: 2,
    sort_order: 5,
  },

  // Raffle packages
  {
    id: generateId(),
    name: 'Golden Raffle - 1 Entry',
    description: 'One entry in the golden raffle drawing',
    category: 'raffle',
    price_cents: 2500, // $25
    quantity_available: null,
    table_size: null,
    sort_order: 1,
  },
  {
    id: generateId(),
    name: 'Golden Raffle - 5 Entries',
    description: 'Five entries in the golden raffle drawing (save $25!)',
    category: 'raffle',
    price_cents: 10000, // $100
    quantity_available: null,
    table_size: null,
    sort_order: 2,
  },
  {
    id: generateId(),
    name: 'Golden Raffle - 12 Entries',
    description: 'Twelve entries in the golden raffle drawing (save $100!)',
    category: 'raffle',
    price_cents: 20000, // $200
    quantity_available: null,
    table_size: null,
    sort_order: 3,
  },
]

const insertProduct = db.prepare(`
  INSERT INTO products (id, name, description, category, price_cents, quantity_available, table_size, sort_order, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`)

for (const product of products) {
  insertProduct.run(
    product.id,
    product.name,
    product.description,
    product.category,
    product.price_cents,
    product.quantity_available,
    product.table_size,
    product.sort_order
  )
}

console.log(`Seeded ${products.length} products`)

// Create some default tables
db.prepare('DELETE FROM tables').run()

const insertTable = db.prepare(`
  INSERT INTO tables (id, name, capacity, is_reserved)
  VALUES (?, ?, 8, ?)
`)

for (let i = 1; i <= 15; i++) {
  insertTable.run(generateId(), `Table ${i}`, i <= 4 ? 1 : 0) // First 4 tables reserved for sponsors
}

console.log('Seeded 15 tables (4 reserved for sponsors)')

console.log('Seed complete!')
