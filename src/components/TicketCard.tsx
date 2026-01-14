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
    <div className={`bg-white rounded-xl shadow-md border p-6 transition-all hover:shadow-lg ${
      featured ? 'border-gala-gold border-2 ring-2 ring-gala-gold/20' : 'border-gray-100'
    } ${soldOut ? 'opacity-60' : ''}`}>
      {featured && (
        <div className="text-gala-gold text-sm font-semibold mb-2 flex items-center gap-1">
          <span className="text-lg">★</span> Featured Sponsor
        </div>
      )}

      <h3 className="text-xl font-semibold text-gala-navy">{product.name}</h3>

      {product.description && (
        <p className="text-gray-600 mt-2 text-sm">{product.description}</p>
      )}

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gala-navy">{formatCents(product.price_cents)}</span>
        {product.table_size && product.table_size > 1 && (
          <span className="text-gray-500 text-sm">/ {product.table_size} seats</span>
        )}
      </div>

      {remaining !== null && remaining > 0 && remaining <= 10 && (
        <p className="text-orange-600 text-sm mt-2">Only {remaining} left!</p>
      )}

      {soldOut ? (
        <div className="mt-4 text-center py-3 bg-gray-100 rounded-lg text-gray-500 font-medium">
          Sold Out
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <select
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-gala-gold/50 focus:border-gala-gold"
          >
            {[...Array(Math.min(10, remaining || 10))].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          <button
            onClick={() => addItem(product, quantity)}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              featured
                ? 'bg-gala-gold text-gala-navy hover:bg-gala-goldLight'
                : 'bg-gala-navy text-white hover:bg-gala-navyLight'
            }`}
          >
            {inCart ? 'Add More' : 'Add to Cart'}
          </button>
        </div>
      )}

      {inCart && (
        <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
          <span>✓</span> {inCart.quantity} in cart
        </p>
      )}
    </div>
  )
}
