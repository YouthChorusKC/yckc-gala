import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Checkout from './pages/Checkout'
import Success from './pages/Success'
import Cancel from './pages/Cancel'
import CheckConfirmation from './pages/CheckConfirmation'
import AdminDashboard from './pages/admin/Dashboard'
import AdminOrders from './pages/admin/Orders'
import AdminAttendees from './pages/admin/Attendees'
import AdminTables from './pages/admin/Tables'
import AdminLogin from './pages/admin/Login'
import AdminUsers from './pages/admin/Users'
import ForgotPassword from './pages/admin/ForgotPassword'
import ResetPassword from './pages/admin/ResetPassword'
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
          <Route path="/check-confirmation" element={<CheckConfirmation />} />

          {/* Admin auth routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/attendees" element={<AdminAttendees />} />
          <Route path="/admin/tables" element={<AdminTables />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Routes>
      </div>
    </CartProvider>
  )
}
