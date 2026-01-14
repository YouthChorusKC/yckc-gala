import { Link, useSearchParams } from 'react-router-dom'

export default function Cancel() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')

  return (
    <div className="min-h-screen gala-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6 opacity-60">★</div>

        <h1 className="text-3xl font-bold text-white/80 mb-4">
          Payment Cancelled
        </h1>

        <p className="text-white/60 text-lg mb-8">
          Your payment was not completed. Your cart items are still saved if you'd like to try again.
        </p>

        <div className="space-y-4">
          <Link to="/checkout" className="btn-gold inline-block w-full">
            Return to Checkout
          </Link>
          <Link to="/" className="text-gala-gold hover:underline block">
            Back to Home
          </Link>
        </div>

        <p className="mt-8 text-white/40 text-sm">
          Having trouble? Contact us at{' '}
          <a href="mailto:ryan@youthchoruskc.org" className="text-gala-gold hover:underline">
            ryan@youthchoruskc.org
          </a>
        </p>
      </div>
    </div>
  )
}
