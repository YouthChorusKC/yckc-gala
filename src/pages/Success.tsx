import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../lib/cart'

export default function Success() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { clearCart } = useCart()

  useEffect(() => {
    // Clear the cart on successful payment
    clearCart()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-green-700 mb-4">
          Thank You!
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Your purchase was successful. We're so excited to see you at the YCKC Gala!
        </p>

        <div className="card text-left mb-6">
          <h2 className="font-semibold mb-2">What's Next?</h2>
          <ul className="text-gray-600 space-y-2 text-sm">
            <li>✓ You'll receive a confirmation email shortly</li>
            <li>✓ We'll reach out to collect attendee names for your tickets</li>
            <li>✓ Seating assignments will be sent closer to the event</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link to="/" className="btn-primary inline-block">
            Back to Home
          </Link>
          <p className="text-sm text-gray-500">
            Questions? Contact us at ryan@youthchoruskc.org
          </p>
        </div>
      </div>
    </div>
  )
}
