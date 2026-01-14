import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSummary, setAdminPassword, getAdminPassword, getExportUrl, type Summary } from '../../lib/api'
import { formatCents } from '../../lib/cart'

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState(getAdminPassword())
  const [needsAuth, setNeedsAuth] = useState(!getAdminPassword())
  const navigate = useNavigate()

  const loadSummary = async () => {
    try {
      setLoading(true)
      const data = await getSummary()
      setSummary(data)
      setNeedsAuth(false)
      setError('')
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        setNeedsAuth(true)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!needsAuth) {
      loadSummary()
    } else {
      setLoading(false)
    }
  }, [needsAuth])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminPassword(password)
    loadSummary()
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="card max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full border rounded px-3 py-2 mb-4"
            autoFocus
          />
          <button type="submit" className="w-full btn-primary">
            Login
          </button>
        </form>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yckc-primary text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">YCKC Gala Admin</h1>
          <Link to="/" className="text-white/80 hover:text-white">
            View Site &rarr;
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Revenue</div>
            <div className="text-3xl font-bold text-green-600">
              {formatCents(summary?.revenue.total || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {summary?.revenue.orderCount || 0} orders
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Donations</div>
            <div className="text-3xl font-bold text-yckc-secondary">
              {formatCents(summary?.revenue.donations || 0)}
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Attendees</div>
            <div className="text-3xl font-bold text-yckc-primary">
              {summary?.attendees.total || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {summary?.attendees.namesCollected || 0} names collected
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Raffle Entries</div>
            <div className="text-3xl font-bold text-purple-600">
              {summary?.raffleEntries || 0}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link to="/admin/orders" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Orders</h2>
            <p className="text-gray-600">View and manage all orders</p>
          </Link>

          <Link to="/admin/attendees" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Attendees</h2>
            <p className="text-gray-600">Manage names and seating</p>
            {summary && summary.attendees.total - summary.attendees.namesCollected > 0 && (
              <p className="text-orange-600 text-sm mt-2">
                {summary.attendees.total - summary.attendees.namesCollected} missing names
              </p>
            )}
          </Link>

          <Link to="/admin/tables" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Tables</h2>
            <p className="text-gray-600">Manage seating assignments</p>
          </Link>
        </div>

        {/* Product Sales */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Product Sales</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 text-sm border-b">
                <th className="pb-2">Product</th>
                <th className="pb-2">Category</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Sold</th>
                <th className="pb-2 text-right">Available</th>
              </tr>
            </thead>
            <tbody>
              {summary?.products.map(product => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{product.name}</td>
                  <td className="py-2 text-gray-600 capitalize">{product.category}</td>
                  <td className="py-2 text-right">{formatCents(product.price_cents)}</td>
                  <td className="py-2 text-right">{product.sold || 0}</td>
                  <td className="py-2 text-right">
                    {product.quantity_available !== null ? product.quantity_available : '∞'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Exports */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Export Data</h2>
          <div className="flex flex-wrap gap-3">
            <a href={getExportUrl('attendees')} className="btn-primary text-sm">
              Export Attendees
            </a>
            <a href={getExportUrl('orders')} className="btn-primary text-sm">
              Export Orders
            </a>
            <a href={getExportUrl('raffle')} className="btn-primary text-sm">
              Export Raffle Entries
            </a>
            <a href={getExportUrl('donors')} className="btn-primary text-sm">
              Export Donors
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
