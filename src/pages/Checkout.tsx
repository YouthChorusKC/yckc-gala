import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart, formatCents } from '../lib/cart'
import { createCheckout } from '../lib/api'

export default function Checkout() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [donation, setDonation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const donationCents = donation ? Math.round(parseFloat(donation) * 100) : 0
  const grandTotal = total + donationCents

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { sessionUrl } = await createCheckout({
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerEmail: email,
        customerName: name || undefined,
        customerPhone: phone || undefined,
        donationCents: donationCents || undefined,
      })

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl
    } catch (err: any) {
      setError(err.message || 'Checkout failed')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link to="/" className="btn-primary">
          Browse Tickets
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link to="/" className="text-yckc-primary hover:underline mb-6 inline-block">
          &larr; Back to tickets
        </Link>

        <h1 className="text-3xl font-bold text-yckc-primary mb-8">Checkout</h1>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-3">
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">Your Order</h2>

              {items.map(item => (
                <div key={item.product.id} className="flex items-center justify-between py-4 border-b last:border-0">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-gray-500">{formatCents(item.product.price_cents)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={item.quantity}
                      onChange={e => updateQuantity(item.product.id, parseInt(e.target.value))}
                      className="border rounded px-2 py-1"
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <span className="w-24 text-right font-medium">
                      {formatCents(item.product.price_cents * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Subtotal</span>
                  <span>{formatCents(total)}</span>
                </div>
              </div>
            </div>

            {/* Additional Donation */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Additional Donation</h2>
              <p className="text-gray-600 mb-4">
                Want to give a little extra to support YCKC's mission?
              </p>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={donation}
                  onChange={e => setDonation(e.target.value)}
                  placeholder="0"
                  className="border rounded px-3 py-2 w-32"
                />
              </div>
            </div>
          </div>

          {/* Contact Info & Pay */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="card">
              <h2 className="text-xl font-semibold mb-4">Your Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>

              {donationCents > 0 && (
                <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Additional donation</span>
                    <span>{formatCents(donationCents)}</span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-xl font-bold mb-4">
                  <span>Total</span>
                  <span>{formatCents(grandTotal)}</span>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Proceed to Payment'}
                </button>

                <p className="mt-3 text-xs text-gray-500 text-center">
                  You'll be redirected to Stripe for secure payment
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
