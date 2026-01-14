import { useCart, formatCents } from '../lib/cart'

export default function CartSummary() {
  const { items, total, itemCount } = useCart()

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm text-gray-600">
        <span className="font-semibold text-yckc-primary">{itemCount}</span> item{itemCount !== 1 ? 's' : ''} in cart
      </div>
      <div className="text-xl font-bold text-yckc-primary">
        {formatCents(total)}
      </div>
    </div>
  )
}
