import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSummary, setAdminPassword, getAdminPassword, getExportUrl, updateProduct, type Summary, type Product } from '../../lib/api'
import { formatCents } from '../../lib/cart'

interface EditingProduct {
  id: string
  name: string
  price_cents: number
  description: string
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState(getAdminPassword())
  const [needsAuth, setNeedsAuth] = useState(!getAdminPassword())
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null)
  const [saving, setSaving] = useState(false)
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

  const startEditing = (product: Product & { sold: number }) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      price_cents: product.price_cents,
      description: product.description || '',
    })
  }

  const saveProduct = async () => {
    if (!editingProduct) return
    setSaving(true)
    try {
      await updateProduct(editingProduct.id, {
        name: editingProduct.name,
        price_cents: editingProduct.price_cents,
        description: editingProduct.description,
      })
      setEditingProduct(null)
      loadSummary()
    } catch (err: any) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
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

        {/* Product Sales - Editable */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Product Sales</h2>
            <span className="text-sm text-gray-500">Click a row to edit</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 text-sm border-b">
                <th className="pb-2">Product</th>
                <th className="pb-2">Category</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Sold</th>
                <th className="pb-2 text-right">Available</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary?.products.map(product => (
                <tr
                  key={product.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => startEditing(product)}
                >
                  <td className="py-2 font-medium">{product.name}</td>
                  <td className="py-2 text-gray-600 capitalize">{product.category}</td>
                  <td className="py-2 text-right">{formatCents(product.price_cents)}</td>
                  <td className="py-2 text-right">{product.sold || 0}</td>
                  <td className="py-2 text-right">
                    {product.quantity_available !== null ? product.quantity_available : '∞'}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      className="text-yckc-primary text-sm hover:underline"
                      onClick={(e) => { e.stopPropagation(); startEditing(product); }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold mb-4">Edit Product</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (cents)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      value={editingProduct.price_cents / 100}
                      onChange={e => setEditingProduct({ ...editingProduct, price_cents: Math.round(parseFloat(e.target.value) * 100) })}
                      className="w-full border rounded px-3 py-2"
                      step="0.01"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Current: {formatCents(editingProduct.price_cents)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingProduct.description}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveProduct}
                  disabled={saving}
                  className="flex-1 btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
