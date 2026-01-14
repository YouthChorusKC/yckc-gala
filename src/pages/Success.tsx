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
    <div className="min-h-screen gala-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Gold starburst decoration */}
        <div className="flex justify-center mb-6">
          <img src="/starburst.png" alt="" className="w-24 h-24 object-contain" />
        </div>

        <h1 className="gala-title text-4xl gold-text mb-4">
          Thank You!
        </h1>

        <p className="text-white/80 text-lg mb-8">
          Your purchase was successful. We're so excited to see you at the YCKC Gala!
        </p>

        <div className="bg-gala-navyLight/50 backdrop-blur rounded-xl border border-gala-gold/20 p-6 text-left mb-8">
          <h2 className="text-gala-gold font-semibold mb-3">What's Next?</h2>
          <ul className="text-white/70 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-gala-gold">★</span>
              You'll receive a confirmation email shortly
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gala-gold">★</span>
              We'll reach out to collect attendee names for your tickets
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gala-gold">★</span>
              Seating assignments will be sent closer to the event
            </li>
          </ul>
        </div>

        <Link to="/" className="btn-gold inline-block mb-6">
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
  )
}
