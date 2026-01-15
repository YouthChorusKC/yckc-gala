import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || './data/gala.db'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    // Ensure directory exists
    const dbDir = path.dirname(DB_PATH)
    if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function initDb(): void {
  const database = getDb()

  // Create tables
  database.exec(`
    -- Products (tickets, sponsorships, raffle packages)
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL CHECK (category IN ('ticket', 'sponsorship', 'raffle', 'donation')),
      price_cents INTEGER NOT NULL,
      quantity_available INTEGER,
      quantity_sold INTEGER DEFAULT 0,
      table_size INTEGER,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      stripe_session_id TEXT,
      stripe_payment_intent TEXT,
      payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'check')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_check', 'paid', 'refunded', 'cancelled')),
      customer_email TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      subtotal_cents INTEGER,
      total_cents INTEGER,
      donation_cents INTEGER DEFAULT 0,
      attendee_data TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      paid_at TEXT
    );

    -- Order line items
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL
    );

    -- Attendees (one per ticket seat)
    CREATE TABLE IF NOT EXISTS attendees (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      name TEXT,
      email TEXT,
      dietary_restrictions TEXT,
      table_id TEXT REFERENCES tables(id),
      checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Tables for seating
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 8,
      is_reserved INTEGER DEFAULT 0,
      notes TEXT
    );

    -- Raffle entries
    CREATE TABLE IF NOT EXISTS raffle_entries (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      attendee_id TEXT REFERENCES attendees(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      entry_number INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Donors (CRM)
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      phone TEXT,
      address TEXT,
      total_donated_cents INTEGER DEFAULT 0,
      order_count INTEGER DEFAULT 0,
      first_order_at TEXT,
      last_order_at TEXT,
      notes TEXT,
      imported_from TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin users
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'view' CHECK (role IN ('edit', 'view')),
      must_change_password INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_token_expires TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    );

    -- Email log
    CREATE TABLE IF NOT EXISTS email_log (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      recipient TEXT NOT NULL,
      email_type TEXT NOT NULL,
      subject TEXT,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resend_id TEXT,
      status TEXT DEFAULT 'sent',
      error TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_attendees_order ON attendees(order_id);
    CREATE INDEX IF NOT EXISTS idx_attendees_table ON attendees(table_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_raffle_entries_order ON raffle_entries(order_id);
  `)

  // Run migrations for existing databases
  runMigrations(database)

  console.log('Database initialized')
}

// Add missing columns to existing tables
function runMigrations(database: Database.Database): void {
  const migrations = [
    // Orders table migrations
    { table: 'orders', column: 'payment_method', sql: "ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'card'" },
    { table: 'orders', column: 'customer_address', sql: "ALTER TABLE orders ADD COLUMN customer_address TEXT" },
    { table: 'orders', column: 'attendee_data', sql: "ALTER TABLE orders ADD COLUMN attendee_data TEXT" },
    // Admin users table migrations
    { table: 'admin_users', column: 'role', sql: "ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'edit'" },
    { table: 'admin_users', column: 'must_change_password', sql: "ALTER TABLE admin_users ADD COLUMN must_change_password INTEGER DEFAULT 0" },
  ]

  for (const migration of migrations) {
    try {
      // Check if column exists
      const columns = database.prepare(`PRAGMA table_info(${migration.table})`).all() as any[]
      const hasColumn = columns.some(col => col.name === migration.column)

      if (!hasColumn) {
        database.exec(migration.sql)
        console.log(`Migration: Added ${migration.column} to ${migration.table}`)
      }
    } catch (err) {
      // Column might already exist or other error - ignore
      console.log(`Migration skipped for ${migration.table}.${migration.column}`)
    }
  }
}

// Helper to generate IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Create or update admin user from environment variables
export async function ensureAdminUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping admin user setup')
    return
  }

  // Dynamic import bcrypt to avoid top-level await issues
  const bcrypt = await import('bcrypt')
  const database = getDb()

  const existing = database.prepare('SELECT id FROM admin_users WHERE email = ?').get(adminEmail.toLowerCase()) as any

  if (existing) {
    // Update password
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    database.prepare('UPDATE admin_users SET password_hash = ?, role = ?, must_change_password = 0 WHERE id = ?')
      .run(passwordHash, 'edit', existing.id)
    console.log(`Admin user ${adminEmail} password updated`)
  } else {
    // Create new admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    database.prepare(`
      INSERT INTO admin_users (id, email, password_hash, role, must_change_password)
      VALUES (?, ?, ?, 'edit', 0)
    `).run(generateId(), adminEmail.toLowerCase(), passwordHash)
    console.log(`Admin user ${adminEmail} created`)
  }
}

// Seed products if database is empty
export function seedIfEmpty(): void {
  const database = getDb()

  const count = database.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
  if (count.count > 0) {
    console.log('Database already has products, skipping seed')
    return
  }

  console.log('Database empty, seeding products...')

  const products = [
    // Tickets
    {
      id: generateId(),
      name: 'Individual Ticket',
      description: 'One seat at the YCKC Gala',
      category: 'ticket',
      price_cents: 7500,
      quantity_available: null,
      table_size: 1,
      sort_order: 1,
    },
    {
      id: generateId(),
      name: 'Table of 8',
      description: 'Reserve a full table for your group',
      category: 'ticket',
      price_cents: 56000,
      quantity_available: 20,
      table_size: 8,
      sort_order: 2,
    },
    // Sponsorship packages
    {
      id: generateId(),
      name: 'Platinum Sponsor',
      description: 'Premium table + logo on program + verbal recognition + 12 raffle entries',
      category: 'sponsorship',
      price_cents: 250000,
      quantity_available: 4,
      table_size: 8,
      sort_order: 1,
    },
    {
      id: generateId(),
      name: 'Gold Sponsor',
      description: 'Reserved table + logo on program + 8 raffle entries',
      category: 'sponsorship',
      price_cents: 150000,
      quantity_available: 8,
      table_size: 8,
      sort_order: 2,
    },
    {
      id: generateId(),
      name: 'Silver Sponsor',
      description: 'Reserved table + name in program + 5 raffle entries',
      category: 'sponsorship',
      price_cents: 100000,
      quantity_available: 10,
      table_size: 8,
      sort_order: 3,
    },
    {
      id: generateId(),
      name: 'Bronze Sponsor',
      description: '4 tickets + name in program',
      category: 'sponsorship',
      price_cents: 50000,
      quantity_available: null,
      table_size: 4,
      sort_order: 4,
    },
    {
      id: generateId(),
      name: 'Friend of YCKC',
      description: '2 tickets + name in program',
      category: 'sponsorship',
      price_cents: 25000,
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
      price_cents: 2500,
      quantity_available: null,
      table_size: null,
      sort_order: 1,
    },
    {
      id: generateId(),
      name: 'Golden Raffle - 5 Entries',
      description: 'Five entries in the golden raffle drawing (save $25!)',
      category: 'raffle',
      price_cents: 10000,
      quantity_available: null,
      table_size: null,
      sort_order: 2,
    },
    {
      id: generateId(),
      name: 'Golden Raffle - 12 Entries',
      description: 'Twelve entries in the golden raffle drawing (save $100!)',
      category: 'raffle',
      price_cents: 20000,
      quantity_available: null,
      table_size: null,
      sort_order: 3,
    },
  ]

  const insertProduct = database.prepare(`
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

  // Create default tables
  const insertTable = database.prepare(`
    INSERT INTO tables (id, name, capacity, is_reserved)
    VALUES (?, ?, 8, ?)
  `)

  for (let i = 1; i <= 15; i++) {
    insertTable.run(generateId(), `Table ${i}`, i <= 4 ? 1 : 0)
  }

  console.log('Seeded 15 tables (4 reserved for sponsors)')
}
