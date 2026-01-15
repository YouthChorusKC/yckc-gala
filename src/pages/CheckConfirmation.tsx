import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../lib/cart'

interface OrderSummary {
  id: string
  customerName: string
  customerEmail: string
  totalCents: number
  status: string
  paymentMethod: string
  createdAt: string
  items: Array<{
    product_name: string
    quantity: number
    total_cents: number
  }>
}

export default function CheckConfirmation() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { clearCart } = useCart()

  useEffect(() => {
    // Clear the cart
    clearCart()

    // Fetch order details
    if (orderId) {
      fetch(`/api/orders/public/${orderId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error)
          setOrder(data)
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    } else {
      setError('No order ID provided')
      setLoading(false)
    }
  }, [orderId])

  const formatCents = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen gala-bg flex items-center justify-center">
        <div className="text-gala-gold">Loading...</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen gala-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white/80 mb-4">Order Not Found</h1>
          <p className="text-white/60 mb-6">{error || 'Unable to load order details'}</p>
          <Link to="/" className="btn-gold inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gala-bg flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/starburst.png" alt="" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="gala-title text-3xl gold-text mb-2">Order Received!</h1>
          <p className="text-white/70">Thank you for supporting YCKC</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-gala-navyLight/50 backdrop-blur rounded-xl border border-gala-gold/20 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-white/50 text-sm">Order Reference</p>
              <p className="text-gala-gold font-mono">{order.id.substring(0, 12).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-sm">Amount Due</p>
              <p className="text-2xl font-bold text-gala-gold">{formatCents(order.totalCents)}</p>
            </div>
          </div>

          <div className="border-t border-gala-gold/20 pt-4 mb-4">
            <p className="text-white/50 text-sm mb-2">Items</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-white/80 text-sm mb-1">
                <span>{item.product_name} x{item.quantity}</span>
                <span>{formatCents(item.total_cents)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gala-gold/20 pt-4">
            <p className="text-white/50 text-sm mb-1">Confirmation sent to</p>
            <p className="text-white/80">{order.customerEmail}</p>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-gala-gold/10 border-2 border-gala-gold/40 rounded-xl p-6 mb-6">
          <h2 className="text-gala-gold font-semibold text-lg mb-4 flex items-center gap-2">
            <span>Payment Instructions</span>
          </h2>

          <div className="space-y-4 text-white/80">
            <div>
              <p className="text-white/50 text-sm mb-1">Make check payable to:</p>
              <p className="font-semibold">Youth Chorus of Kansas City</p>
            </div>

            <div>
              <p className="text-white/50 text-sm mb-1">Mail to:</p>
              <p>Youth Chorus of Kansas City</p>
              <p>P.O. Box 413012</p>
              <p>Kansas City, MO 64141</p>
            </div>

            <div>
              <p className="text-white/50 text-sm mb-1">Please write on memo line:</p>
              <p className="font-mono text-gala-gold">Gala - {order.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-gala-navyLight/30 rounded-xl border border-gala-gold/10 p-6 mb-6">
          <h2 className="text-gala-gold font-semibold mb-3">What's Next?</h2>
          <ul className="text-white/70 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-gala-gold">1.</span>
              Mail your check to the address above
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gala-gold">2.</span>
              You'll receive confirmation when payment is received
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gala-gold">3.</span>
              We'll reach out to collect attendee names for your tickets
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gala-gold">4.</span>
              Seating assignments will be sent closer to the event
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="text-center">
          <Link to="/" className="btn-gold inline-block mb-4">
            Back to Home
          </Link>
          <p className="text-white/50 text-sm">
            Questions? Contact us at{' '}
            <a href="mailto:ryan@youthchoruskc.org" className="text-gala-gold hover:underline">
              ryan@youthchoruskc.org
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
