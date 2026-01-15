import type { Product } from '../lib/api'
import { useCart, formatCents } from '../lib/cart'

interface Props {
  products: Product[]
  onClose: () => void
}

export default function RaffleModal({ products, onClose }: Props) {
  const { addItem, items } = useCart()

  // Sort by price
  const sorted = [...products].sort((a, b) => a.price_cents - b.price_cents)

  const getEntries = (product: Product): number => {
    if (product.price_cents === 2500) return 1
    if (product.price_cents === 10000) return 5
    if (product.price_cents === 20000) return 12
    return 1
  }

  const getSavings = (product: Product): number => {
    const entries = getEntries(product)
    const fullPrice = entries * 2500
    return fullPrice - product.price_cents
  }

  const handleAdd = (product: Product) => {
    addItem(product)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-gala-navy rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center border-b border-gala-gold/20">
          <h2 className="text-2xl md:text-3xl font-bold gold-text mb-2">Golden Raffle</h2>
          <p className="text-white/70">Enter for a chance to win amazing prizes!</p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {sorted.map(product => {
            const entries = getEntries(product)
            const savings = getSavings(product)
            const inCart = items.find(item => item.product.id === product.id)
            const isBestValue = product.price_cents === 20000

            return (
              <div
                key={product.id}
                className={`rounded-xl p-4 flex items-center justify-between ${
                  isBestValue
                    ? 'bg-gala-gold/20 border-2 border-gala-gold'
                    : 'bg-gala-navyLight/50 border border-gala-gold/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gala-gold text-xl font-bold">{entries}</span>
                    <span className="text-white/80">{entries === 1 ? 'Entry' : 'Entries'}</span>
                    {isBestValue && (
                      <span className="bg-gala-gold text-gala-navy text-xs font-bold px-2 py-0.5 rounded">
                        BEST VALUE
                      </span>
                    )}
                  </div>
                  <div className="text-white/60 text-sm">
                    {formatCents(product.price_cents)}
                    {savings > 0 && (
                      <span className="text-green-400 ml-2">Save {formatCents(savings)}</span>
                    )}
                  </div>
                  {inCart && (
                    <div className="text-green-400 text-xs mt-1">
                      {inCart.quantity} in cart ({inCart.quantity * entries} entries)
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAdd(product)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isBestValue
                      ? 'bg-gala-gold text-gala-navy hover:bg-gala-goldLight'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Add
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gala-gold/20 flex justify-between items-center">
          <p className="text-white/50 text-sm">Do not need to be present to win</p>
          <button
            onClick={onClose}
            className="text-gala-gold hover:text-gala-goldLight font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
