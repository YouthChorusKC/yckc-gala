import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketCard from './TicketCard'
import { CartProvider } from '../lib/cart'
import type { Product } from '../lib/api'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'ticket-1',
    name: 'Gala Ticket',
    description: 'One seat at the gala',
    category: 'ticket',
    price_cents: 7500,
    quantity_available: 100,
    quantity_sold: 10,
    table_size: null,
    is_active: true,
    sort_order: 0,
    ...overrides,
  }
}

function renderCard(product: Product, featured = false) {
  return render(
    <CartProvider>
      <TicketCard product={product} featured={featured} />
    </CartProvider>,
  )
}

describe('TicketCard', () => {
  it('renders product name and price', () => {
    renderCard(makeProduct())

    expect(screen.getByText('Gala Ticket')).toBeInTheDocument()
    expect(screen.getByText('$75.00')).toBeInTheDocument()
  })

  it('renders description', () => {
    renderCard(makeProduct({ description: 'Includes dinner and drinks' }))
    expect(screen.getByText('Includes dinner and drinks')).toBeInTheDocument()
  })

  it('shows "Add to Cart" button when not in cart', () => {
    renderCard(makeProduct())
    expect(screen.getByText('Add to Cart')).toBeInTheDocument()
  })

  it('shows "Sold Out" when no remaining stock', () => {
    renderCard(makeProduct({ quantity_available: 10, quantity_sold: 10 }))
    expect(screen.getByText('Sold Out')).toBeInTheDocument()
    expect(screen.queryByText('Add to Cart')).not.toBeInTheDocument()
  })

  it('shows low stock warning when <= 10 remaining', () => {
    renderCard(makeProduct({ quantity_available: 15, quantity_sold: 10 }))
    expect(screen.getByText('Only 5 left!')).toBeInTheDocument()
  })

  it('does not show low stock warning when > 10 remaining', () => {
    renderCard(makeProduct({ quantity_available: 100, quantity_sold: 10 }))
    expect(screen.queryByText(/Only \d+ left!/)).not.toBeInTheDocument()
  })

  it('shows table size for multi-seat products', () => {
    renderCard(makeProduct({ table_size: 8 }))
    expect(screen.getByText('/ 8 seats')).toBeInTheDocument()
  })

  it('does not show table size for single-seat products', () => {
    renderCard(makeProduct({ table_size: 1 }))
    expect(screen.queryByText(/seats/)).not.toBeInTheDocument()
  })

  it('shows featured badge when featured', () => {
    renderCard(makeProduct(), true)
    expect(screen.getByText('Featured Sponsor')).toBeInTheDocument()
  })

  it('shows "Add More" and quantity after adding to cart', async () => {
    const user = userEvent.setup()
    renderCard(makeProduct())

    await user.click(screen.getByText('Add to Cart'))

    expect(screen.getByText('Add More')).toBeInTheDocument()
    expect(screen.getByText(/1 in cart/)).toBeInTheDocument()
  })

  it('treats unlimited stock (null quantity_available) as available', () => {
    renderCard(makeProduct({ quantity_available: null }))
    expect(screen.getByText('Add to Cart')).toBeInTheDocument()
    expect(screen.queryByText('Sold Out')).not.toBeInTheDocument()
  })
})
