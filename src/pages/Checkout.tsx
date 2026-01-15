import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart, formatCents } from '../lib/cart'
import { createCheckout } from '../lib/api'

interface AttendeeInput {
  name: string
  dietary: string
}

export default function Checkout() {
  const { items, total, updateQuantity, removeItem } = useCart()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [donation, setDonation] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'check'>('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Calculate total seats needed
  const totalSeats = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.product.category === 'ticket' || item.product.category === 'sponsorship') {
        const seatsPerUnit = item.product.table_size || 1
        return sum + (item.quantity * seatsPerUnit)
      }
      return sum
    }, 0)
  }, [items])

  // Check for sponsorship + table combo (both include tables)
  const hasSponsorshipWithTable = items.some(item =>
    item.product.category === 'sponsorship' && (item.product.table_size || 0) > 0
  )
  const hasTableTicket = items.some(item =>
    item.product.category === 'ticket' && item.product.name.toLowerCase().includes('table')
  )
  const showTableWarning = hasSponsorshipWithTable && hasTableTicket

  // Attendee name collection - default to collecting names now
  const [collectNamesNow, setCollectNamesNow] = useState(true)
  const [attendees, setAttendees] = useState<AttendeeInput[]>([])
  const [attendeesInitialized, setAttendeesInitialized] = useState(false)

  // Initialize attendees array when totalSeats changes or on first render
  // Prefill first attendee with purchaser name
  const initializeAttendees = (purchaserName: string = '') => {
    const newAttendees = Array(totalSeats).fill(null).map((_, index) => ({
      name: index === 0 ? purchaserName : '',
      dietary: ''
    }))
    setAttendees(newAttendees)
    setAttendeesInitialized(true)
  }

  // Initialize on mount or when totalSeats changes
  if (totalSeats > 0 && !attendeesInitialized) {
    initializeAttendees(name)
  }

  // Update first attendee name when purchaser name changes
  const handleNameChange = (newName: string) => {
    setName(newName)
    if (attendees.length > 0 && collectNamesNow) {
      setAttendees(prev => {
        const updated = [...prev]
        updated[0] = { ...updated[0], name: newName }
        return updated
      })
    }
  }

  const handleCollectNamesChange = (collect: boolean) => {
    setCollectNamesNow(collect)
    if (collect && attendees.length !== totalSeats) {
      initializeAttendees(name)
    }
  }

  const updateAttendee = (index: number, field: 'name' | 'dietary', value: string) => {
    setAttendees(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const donationCents = donation ? Math.round(parseFloat(donation) * 100) : 0
  const grandTotal = total + donationCents

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Combine address fields
    const fullAddress = [street, city, state, zip].filter(Boolean).join(', ')

    try {
      const result = await createCheckout({
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerEmail: email,
        customerName: name || undefined,
        customerPhone: phone || undefined,
        customerAddress: fullAddress || undefined,
        donationCents: donationCents || undefined,
        paymentMethod,
        attendees: collectNamesNow ? attendees.filter(a => a.name) : undefined,
      })

      if (paymentMethod === 'check' && result.redirectUrl) {
        // Redirect to check confirmation page
        navigate(result.redirectUrl)
      } else if (result.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.sessionUrl
      }
    } catch (err: any) {
      setError(err.message || 'Checkout failed')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen gala-bg flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white/80 mb-4">Your cart is empty</h1>
        <Link to="/" className="btn-gold">
          Browse Tickets
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gala-cream py-12 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 overflow-x-hidden">
        <Link to="/" className="text-gala-navy hover:text-gala-gold mb-6 inline-block">
          &larr; Back to tickets
        </Link>

        <h1 className="text-3xl font-bold text-gala-navy mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-5 gap-8">
            {/* Left Column - Cart & Attendees */}
            <div className="md:col-span-3 space-y-6">
              {/* Cart Items */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gala-navy mb-4">Your Order</h2>

                {items.map(item => (
                  <div key={item.product.id} className="py-4 border-b last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gala-navy">{item.product.name}</h3>
                        <p className="text-sm text-gray-500">{formatCents(item.product.price_cents)} each</p>
                      </div>
                      <span className="font-medium text-gala-navy whitespace-nowrap">
                        {formatCents(item.product.price_cents * item.quantity)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <select
                        value={item.quantity}
                        onChange={e => updateQuantity(item.product.id, parseInt(e.target.value))}
                        className="border rounded px-2 py-1"
                      >
                        {[...Array(10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-lg font-semibold text-gala-navy">
                    <span>Subtotal</span>
                    <span>{formatCents(total)}</span>
                  </div>
                </div>

                {showTableWarning && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      <strong>Note:</strong> Your cart includes both a sponsorship package (which includes a table) and a separate table purchase. This is fine if you want multiple tables, but please confirm this is what you intended.
                    </p>
                  </div>
                )}
              </div>

              {/* Attendee Names */}
              {totalSeats > 0 && (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <h2 className="text-xl font-semibold text-gala-navy mb-2">Attendee Names</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    You have {totalSeats} seat{totalSeats > 1 ? 's' : ''} to fill
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="collectNames"
                        checked={!collectNamesNow}
                        onChange={() => handleCollectNamesChange(false)}
                        className="text-gala-gold focus:ring-gala-gold"
                      />
                      <span className="text-sm">I'll provide names later</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="collectNames"
                        checked={collectNamesNow}
                        onChange={() => handleCollectNamesChange(true)}
                        className="text-gala-gold focus:ring-gala-gold"
                      />
                      <span className="text-sm">Enter names now</span>
                    </label>
                  </div>

                  {collectNamesNow && (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {attendees.map((attendee, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                          <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                          <input
                            type="text"
                            placeholder="Name"
                            value={attendee.name}
                            onChange={e => updateAttendee(index, 'name', e.target.value)}
                            className="flex-1 border rounded px-3 py-2 text-sm min-w-0"
                          />
                          <input
                            type="text"
                            placeholder="Dietary needs"
                            value={attendee.dietary}
                            onChange={e => updateAttendee(index, 'dietary', e.target.value)}
                            className="sm:w-36 border rounded px-3 py-2 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!collectNamesNow && (
                    <p className="text-sm text-gray-500 italic">
                      We'll reach out after your purchase to collect attendee names
                    </p>
                  )}
                </div>
              )}

              {/* Additional Donation */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gala-navy mb-4">Additional Donation</h2>
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

            {/* Right Column - Contact & Payment */}
            <div className="md:col-span-2 space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gala-navy mb-4">Your Information</h2>

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
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => handleNameChange(e.target.value)}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mailing Address
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      className="w-full border rounded px-3 py-2 mb-2"
                      placeholder="Street address"
                      autoComplete="street-address"
                    />
                    <div className="grid grid-cols-6 gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className="col-span-3 border rounded px-3 py-2"
                        placeholder="City"
                        autoComplete="address-level2"
                      />
                      <input
                        type="text"
                        value={state}
                        onChange={e => setState(e.target.value)}
                        className="col-span-1 border rounded px-2 py-2 text-sm"
                        placeholder="State"
                        autoComplete="address-level1"
                      />
                      <input
                        type="text"
                        value={zip}
                        onChange={e => setZip(e.target.value)}
                        className="col-span-2 border rounded px-2 py-2"
                        placeholder="ZIP"
                        autoComplete="postal-code"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      For thank-you correspondence
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gala-navy mb-4">Payment Method</h2>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-gala-gold transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="mt-0.5 text-gala-gold focus:ring-gala-gold"
                    />
                    <div>
                      <span className="font-medium text-gala-navy">Credit Card</span>
                      <p className="text-sm text-gray-500">Secure checkout via Stripe</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-gala-gold transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'check'}
                      onChange={() => setPaymentMethod('check')}
                      className="mt-0.5 text-gala-gold focus:ring-gala-gold"
                    />
                    <div>
                      <span className="font-medium text-gala-navy">Pay by Check</span>
                      <p className="text-sm text-gray-500">Mail check to YCKC</p>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'check' && (
                  <div className="mt-4 p-4 bg-gala-cream rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Mail your check to:</p>
                    <div className="text-sm text-gray-800 mb-3">
                      <p className="font-semibold">Youth Chorus of Kansas City</p>
                      <p>PO Box 8703</p>
                      <p>Kansas City, MO 64114</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Make check payable to "Youth Chorus of Kansas City"
                    </p>
                  </div>
                )}
              </div>

              {/* Order Total & Submit */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                {donationCents > 0 && (
                  <div className="text-sm text-gray-600 mb-2">
                    <div className="flex justify-between">
                      <span>Additional donation</span>
                      <span>{formatCents(donationCents)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-xl font-bold text-gala-navy mb-4">
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
                  className="w-full btn-gold disabled:opacity-50"
                >
                  {loading ? 'Processing...' : paymentMethod === 'card' ? 'Proceed to Payment' : 'Submit Order'}
                </button>

                <p className="mt-3 text-xs text-gray-500 text-center">
                  {paymentMethod === 'card'
                    ? "You'll be redirected to Stripe for secure payment"
                    : "You'll receive instructions to mail your check"
                  }
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
