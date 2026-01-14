import { Link, useSearchParams } from 'react-router-dom'

export default function Cancel() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-3xl font-bold text-gray-700 mb-4">
          Payment Cancelled
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Your payment was not completed. Your cart items are still saved if you'd like to try again.
        </p>

        <div className="space-y-3">
          <Link to="/checkout" className="btn-primary inline-block">
            Return to Checkout
          </Link>
          <div>
            <Link to="/" className="text-yckc-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Having trouble? Contact us at ryan@youthchoruskc.org
        </p>
      </div>
    </div>
  )
}
