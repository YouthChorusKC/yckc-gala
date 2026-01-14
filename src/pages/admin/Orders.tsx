import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, getOrder, type Order } from '../../lib/api'
import { formatCents } from '../../lib/cart'

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await getOrders(statusFilter || undefined)
      setOrders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const viewOrder = async (id: string) => {
    const data = await getOrder(id)
    setSelectedOrder(data)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yckc-primary text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-white/80 hover:text-white">&larr; Back</Link>
            <h1 className="text-2xl font-bold">Orders</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="md:col-span-2">
            <div className="card">
              {loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : orders.length === 0 ? (
                <div className="text-gray-500">No orders found</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 text-sm border-b">
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2 text-right">Attendees</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr
                        key={order.id}
                        onClick={() => viewOrder(order.id)}
                        className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
                      >
                        <td className="py-3">
                          <div className="font-medium">{order.customer_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{order.customer_email}</div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.status === 'paid' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatCents(order.total_cents)}
                        </td>
                        <td className="py-3 text-right">
                          {order.names_collected}/{order.attendee_count}
                        </td>
                        <td className="py-3 text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Order Detail */}
          <div>
            {selectedOrder ? (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Order Details</h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Customer:</span>
                    <div className="font-medium">{selectedOrder.customer_name || 'N/A'}</div>
                    <div>{selectedOrder.customer_email}</div>
                    {selectedOrder.customer_phone && <div>{selectedOrder.customer_phone}</div>}
                  </div>

                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      selectedOrder.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500">Total:</span>
                    <span className="ml-2 font-bold">{formatCents(selectedOrder.total_cents)}</span>
                  </div>

                  {selectedOrder.donation_cents > 0 && (
                    <div>
                      <span className="text-gray-500">Donation:</span>
                      <span className="ml-2">{formatCents(selectedOrder.donation_cents)}</span>
                    </div>
                  )}
                </div>

                <h3 className="font-semibold mt-6 mb-2">Items</h3>
                <ul className="text-sm space-y-1">
                  {selectedOrder.items?.map((item: any) => (
                    <li key={item.id}>
                      {item.quantity}x {item.product_name} - {formatCents(item.total_cents)}
                    </li>
                  ))}
                </ul>

                <h3 className="font-semibold mt-6 mb-2">Attendees ({selectedOrder.attendees?.length || 0})</h3>
                <ul className="text-sm space-y-1">
                  {selectedOrder.attendees?.map((a: any, i: number) => (
                    <li key={a.id} className={a.name ? '' : 'text-orange-600'}>
                      {i + 1}. {a.name || '(Name needed)'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="card text-gray-500 text-center py-8">
                Select an order to view details
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
