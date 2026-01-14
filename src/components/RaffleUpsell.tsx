import type { Product } from '../lib/api'
import { useCart, formatCents } from '../lib/cart'

interface Props {
  products: Product[]
}

export default function RaffleUpsell({ products }: Props) {
  const { addItem, items } = useCart()

  // Sort by price to show best value
  const sorted = [...products].sort((a, b) => a.price_cents - b.price_cents)

  const getEntries = (product: Product): number => {
    if (product.price_cents === 2500) return 1
    if (product.price_cents === 10000) return 5
    if (product.price_cents === 20000) return 12
    return 1
  }

  const getSavings = (product: Product): string | null => {
    const entries = getEntries(product)
    const fullPrice = entries * 2500 // $25 per entry
    const savings = fullPrice - product.price_cents
    return savings > 0 ? formatCents(savings) : null
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {sorted.map(product => {
        const entries = getEntries(product)
        const savings = getSavings(product)
        const inCart = items.find(item => item.product.id === product.id)

        return (
          <div
            key={product.id}
            className={`card text-center ${savings ? 'border-yckc-secondary border-2' : ''}`}
          >
            <div className="text-4xl font-bold text-yckc-primary">{entries}</div>
            <div className="text-gray-600 mb-2">
              {entries === 1 ? 'Entry' : 'Entries'}
            </div>

            <div className="text-2xl font-bold mb-1">
              {formatCents(product.price_cents)}
            </div>

            {savings && (
              <div className="text-green-600 text-sm font-medium mb-3">
                Save {savings}!
              </div>
            )}

            <button
              onClick={() => addItem(product)}
              className={`w-full ${savings ? 'btn-secondary' : 'btn-primary'}`}
            >
              Add to Cart
            </button>

            {inCart && (
              <p className="mt-2 text-sm text-green-600">
                ✓ {inCart.quantity} in cart ({inCart.quantity * entries} entries)
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
