import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, setAdminPassword } from '../../lib/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLegacy, setShowLegacy] = useState(false)
  const [legacyPassword, setLegacyPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/admin')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLegacyLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminPassword(legacyPassword)
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gala-navy">YCKC Gala</h1>
          <p className="text-gray-600">Admin Login</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          {!showLegacy ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="********"
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
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center">
                <Link
                  to="/admin/forgot-password"
                  className="text-sm text-gala-gold hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLegacyLogin} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter the admin password to access the dashboard.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={legacyPassword}
                  onChange={e => setLegacyPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="********"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gala-navy text-white rounded-lg font-medium hover:bg-gala-navy/90 transition-colors"
              >
                Continue
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t text-center">
            <button
              onClick={() => setShowLegacy(!showLegacy)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showLegacy ? 'Use email login' : 'Use legacy password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
