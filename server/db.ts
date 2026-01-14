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
      stripe_session_id TEXT UNIQUE,
      stripe_payment_intent TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
      customer_email TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      subtotal_cents INTEGER,
      total_cents INTEGER,
      donation_cents INTEGER DEFAULT 0,
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

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_attendees_order ON attendees(order_id);
    CREATE INDEX IF NOT EXISTS idx_attendees_table ON attendees(table_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_raffle_entries_order ON raffle_entries(order_id);
  `)

  console.log('Database initialized')
}

// Helper to generate IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
