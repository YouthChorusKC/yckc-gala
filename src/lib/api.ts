const API_BASE = '/api'

export interface Product {
  id: string
  name: string
  description: string
  category: 'ticket' | 'sponsorship' | 'raffle' | 'donation'
  price_cents: number
  quantity_available: number | null
  quantity_sold: number
  table_size: number | null
  is_active: boolean
  sort_order: number
}

export interface ProductsResponse {
  ticket: Product[]
  sponsorship: Product[]
  raffle: Product[]
}

export interface Order {
  id: string
  stripe_session_id: string
  status: string
  customer_email: string
  customer_name: string
  customer_phone: string
  total_cents: number
  donation_cents: number
  created_at: string
  paid_at: string
  attendee_count?: number
  names_collected?: number
}

export interface Attendee {
  id: string
  order_id: string
  name: string | null
  email: string | null
  dietary_restrictions: string | null
  table_id: string | null
  table_name?: string
  checked_in: boolean
  order_email?: string
  order_name?: string
}

export interface Table {
  id: string
  name: string
  capacity: number
  is_reserved: boolean
  notes: string | null
  current_count?: number
}

export interface Summary {
  revenue: {
    total: number
    donations: number
    orderCount: number
  }
  attendees: {
    total: number
    namesCollected: number
    checkedIn: number
  }
  raffleEntries: number
  products: Array<Product & { sold: number }>
}

// Public API
export async function getProducts(): Promise<ProductsResponse> {
  const res = await fetch(`${API_BASE}/products`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function createCheckout(data: {
  items: Array<{ productId: string; quantity: number }>
  customerEmail: string
  customerName?: string
  customerPhone?: string
  donationCents?: number
}): Promise<{ sessionUrl: string; orderId: string }> {
  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Checkout failed')
  }
  return res.json()
}

// Admin API
let adminPassword = ''

export function setAdminPassword(password: string) {
  adminPassword = password
  localStorage.setItem('adminPassword', password)
}

export function getAdminPassword(): string {
  if (!adminPassword) {
    adminPassword = localStorage.getItem('adminPassword') || ''
  }
  return adminPassword
}

async function adminFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-admin-password': getAdminPassword(),
    },
  })
  if (res.status === 401) {
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || 'Request failed')
  }
  return res
}

export async function getSummary(): Promise<Summary> {
  const res = await adminFetch(`${API_BASE}/reports/summary`)
  return res.json()
}

export async function getOrders(status?: string): Promise<Order[]> {
  const url = status
    ? `${API_BASE}/orders?status=${status}`
    : `${API_BASE}/orders`
  const res = await adminFetch(url)
  return res.json()
}

export async function getOrder(id: string): Promise<Order & { items: any[]; attendees: Attendee[] }> {
  const res = await adminFetch(`${API_BASE}/orders/${id}`)
  return res.json()
}

export async function getAttendees(): Promise<Attendee[]> {
  const res = await adminFetch(`${API_BASE}/attendees`)
  return res.json()
}

export async function getMissingNames(): Promise<Attendee[]> {
  const res = await adminFetch(`${API_BASE}/attendees/missing-names`)
  return res.json()
}

export async function updateAttendee(id: string, data: Partial<Attendee>): Promise<void> {
  await adminFetch(`${API_BASE}/attendees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function checkInAttendee(id: string): Promise<void> {
  await adminFetch(`${API_BASE}/attendees/${id}/checkin`, { method: 'POST' })
}

export async function getTables(): Promise<Table[]> {
  const res = await adminFetch(`${API_BASE}/tables`)
  return res.json()
}

export async function getTable(id: string): Promise<Table & { attendees: Attendee[] }> {
  const res = await adminFetch(`${API_BASE}/tables/${id}`)
  return res.json()
}

export async function createTable(data: Partial<Table>): Promise<Table> {
  const res = await adminFetch(`${API_BASE}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function createTablesBulk(count: number, prefix?: string): Promise<Table[]> {
  const res = await adminFetch(`${API_BASE}/tables/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, prefix }),
  })
  return res.json()
}

export async function deleteTable(id: string): Promise<void> {
  await adminFetch(`${API_BASE}/tables/${id}`, { method: 'DELETE' })
}

export function getExportUrl(type: 'attendees' | 'orders' | 'raffle' | 'donors'): string {
  return `${API_BASE}/reports/export/${type}?password=${encodeURIComponent(getAdminPassword())}`
}

// Update product (admin only)
export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  const res = await adminFetch(`${API_BASE}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

// Complete order manually (for test mode)
export async function completeOrder(id: string): Promise<void> {
  await adminFetch(`${API_BASE}/orders/${id}/complete`, { method: 'POST' })
}
