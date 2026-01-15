import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gala-navy">YCKC Gala</h1>
          <p className="text-gray-600">Reset Password</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          {submitted ? (
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">&#10003;</div>
              <h2 className="text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-gray-600 mb-6">
                If an account exists with that email, we've sent password reset instructions.
              </p>
              <Link
                to="/admin/login"
                className="text-gala-gold hover:underline"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="admin@youthchoruskc.org"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gala-navy text-white rounded-lg font-medium hover:bg-gala-navy/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <Link
                  to="/admin/login"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
