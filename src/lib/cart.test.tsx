import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart, formatCents } from './cart'
import type { Product } from './api'

// Helper to create a test product
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Gala Ticket',
    description: 'One ticket to the gala',
    category: 'ticket',
    price_cents: 7500,
    quantity_available: 100,
    quantity_sold: 0,
    table_size: null,
    is_active: true,
    sort_order: 0,
    ...overrides,
  }
}

function renderCartHook() {
  return renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  })
}

// ---------------------------------------------------------------------------
// formatCents
// ---------------------------------------------------------------------------

describe('formatCents', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCents(10000)).toBe('$100.00')
  })

  it('formats cents correctly', () => {
    expect(formatCents(7500)).toBe('$75.00')
    expect(formatCents(199)).toBe('$1.99')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00')
  })

  it('formats large amounts with commas', () => {
    expect(formatCents(1000000)).toBe('$10,000.00')
  })
})

// ---------------------------------------------------------------------------
// useCart hook
// ---------------------------------------------------------------------------

describe('useCart', () => {
  it('throws when used outside CartProvider', () => {
    // renderHook without wrapper should throw
    expect(() => {
      renderHook(() => useCart())
    }).toThrow('useCart must be used within CartProvider')
  })

  it('starts with empty cart', () => {
    const { result } = renderCartHook()
    expect(result.current.items).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.itemCount).toBe(0)
  })

  it('adds an item', () => {
    const { result } = renderCartHook()
    const product = makeProduct()

    act(() => result.current.addItem(product))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.id).toBe('prod-1')
    expect(result.current.items[0].quantity).toBe(1)
    expect(result.current.total).toBe(7500)
    expect(result.current.itemCount).toBe(1)
  })

  it('adds an item with custom quantity', () => {
    const { result } = renderCartHook()
    const product = makeProduct()

    act(() => result.current.addItem(product, 3))

    expect(result.current.items[0].quantity).toBe(3)
    expect(result.current.total).toBe(22500)
    expect(result.current.itemCount).toBe(3)
  })

  it('increments quantity when adding existing item', () => {
    const { result } = renderCartHook()
    const product = makeProduct()

    act(() => result.current.addItem(product, 2))
    act(() => result.current.addItem(product, 1))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(3)
    expect(result.current.total).toBe(22500)
  })

  it('tracks multiple products separately', () => {
    const { result } = renderCartHook()
    const ticket = makeProduct({ id: 'ticket-1', price_cents: 7500 })
    const sponsorship = makeProduct({
      id: 'sponsor-1',
      name: 'Gold Sponsor',
      category: 'sponsorship',
      price_cents: 250000,
    })

    act(() => result.current.addItem(ticket, 2))
    act(() => result.current.addItem(sponsorship, 1))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.total).toBe(2 * 7500 + 250000)
    expect(result.current.itemCount).toBe(3)
  })

  it('removes an item', () => {
    const { result } = renderCartHook()
    const product = makeProduct()

    act(() => result.current.addItem(product, 2))
    act(() => result.current.removeItem('prod-1'))

    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('removes only the target item', () => {
    const { result } = renderCartHook()
    const a = makeProduct({ id: 'a', price_cents: 1000 })
    const b = makeProduct({ id: 'b', price_cents: 2000 })

    act(() => {
      result.current.addItem(a)
      result.current.addItem(b)
    })
    act(() => result.current.removeItem('a'))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.id).toBe('b')
  })

  it('updates quantity', () => {
    const { result } = renderCartHook()
    const product = makeProduct()

    act(() => result.current.addItem(product, 1))
    act(() => result.current.updateQuantity('prod-1', 5))

    expect(result.current.items[0].quantity).toBe(5)
    expect(result.current.total).toBe(37500)
  })

  it('removes item when quantity updated to 0', () => {
    const { result } = renderCartHook()
    const product = makeProduct()

    act(() => result.current.addItem(product, 3))
    act(() => result.current.updateQuantity('prod-1', 0))

    expect(result.current.items).toHaveLength(0)
  })

  it('removes item when quantity updated to negative', () => {
    const { result } = renderCartHook()
    const product = makeProduct()

    act(() => result.current.addItem(product, 2))
    act(() => result.current.updateQuantity('prod-1', -1))

    expect(result.current.items).toHaveLength(0)
  })

  it('clears all items', () => {
    const { result } = renderCartHook()

    act(() => {
      result.current.addItem(makeProduct({ id: '1' }))
      result.current.addItem(makeProduct({ id: '2' }))
      result.current.addItem(makeProduct({ id: '3' }))
    })

    expect(result.current.items).toHaveLength(3)

    act(() => result.current.clearCart())

    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
    expect(result.current.itemCount).toBe(0)
  })
})
