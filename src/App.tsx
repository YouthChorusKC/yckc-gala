import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Checkout from './pages/Checkout'
import Success from './pages/Success'
import Cancel from './pages/Cancel'
import AdminDashboard from './pages/admin/Dashboard'
import AdminOrders from './pages/admin/Orders'
import AdminAttendees from './pages/admin/Attendees'
import AdminTables from './pages/admin/Tables'
import { CartProvider } from './lib/cart'

export default function App() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/attendees" element={<AdminAttendees />} />
          <Route path="/admin/tables" element={<AdminTables />} />
        </Routes>
      </div>
    </CartProvider>
  )
}
