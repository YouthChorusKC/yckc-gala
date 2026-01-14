import { useState } from 'react'
import type { Product } from '../lib/api'
import { useCart, formatCents } from '../lib/cart'

interface Props {
  product: Product
  featured?: boolean
}

export default function TicketCard({ product, featured }: Props) {
  const { addItem, items } = useCart()
  const [quantity, setQuantity] = useState(1)

  const inCart = items.find(item => item.product.id === product.id)
  const remaining = product.quantity_available !== null
    ? product.quantity_available - product.quantity_sold
    : null

  const soldOut = remaining !== null && remaining <= 0

  return (
    <div className={`card ${featured ? 'border-yckc-secondary border-2' : ''} ${soldOut ? 'opacity-60' : ''}`}>
      {featured && (
        <div className="text-yckc-secondary text-sm font-semibold mb-2">
          ★ Featured
        </div>
      )}

      <h3 className="text-xl font-semibold text-yckc-primary">{product.name}</h3>

      {product.description && (
        <p className="text-gray-600 mt-2 text-sm">{product.description}</p>
      )}

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{formatCents(product.price_cents)}</span>
        {product.table_size && product.table_size > 1 && (
          <span className="text-gray-500 text-sm">/ {product.table_size} seats</span>
        )}
      </div>

      {remaining !== null && remaining > 0 && remaining <= 10 && (
        <p className="text-orange-600 text-sm mt-2">Only {remaining} left!</p>
      )}

      {soldOut ? (
        <div className="mt-4 text-center py-3 bg-gray-100 rounded text-gray-500 font-medium">
          Sold Out
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <select
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {[...Array(Math.min(10, remaining || 10))].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          <button
            onClick={() => addItem(product, quantity)}
            className="flex-1 btn-primary"
          >
            {inCart ? 'Add More' : 'Add to Cart'}
          </button>
        </div>
      )}

      {inCart && (
        <p className="mt-2 text-sm text-green-600">
          ✓ {inCart.quantity} in cart
        </p>
      )}
    </div>
  )
}
