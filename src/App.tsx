import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ToastContainer } from '@/components/ui'
import AdminLayout from '@/components/admin/AdminLayout'

import Login from '@/pages/Login'
import Dashboard from '@/pages/admin/Dashboard'
import Categories from '@/pages/admin/Categories'
import Products from '@/pages/admin/Products'
import PriceTables from '@/pages/admin/PriceTables'
import PriceTableEditor from '@/pages/admin/PriceTableEditor'
import Customers from '@/pages/admin/Customers'
import Orders from '@/pages/admin/Orders'
import OrderDetail from '@/pages/admin/OrderDetail'
import Settings from '@/pages/admin/Settings'

import Catalog from '@/pages/app/Catalog'
import Checkout from '@/pages/app/Checkout'
import MyOrders from '@/pages/app/MyOrders'
import MyOrderDetail from '@/pages/app/MyOrderDetail'
import OrderPrint from '@/pages/OrderPrint'

function RequireAuth({ role, children }: { role?: 'admin' | 'cliente'; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Carregando…</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />
  }

  return <>{children}</>
}

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout><Dashboard /></AdminLayout></RequireAuth>} />
        <Route path="/admin/orders" element={<RequireAuth role="admin"><AdminLayout><Orders /></AdminLayout></RequireAuth>} />
        <Route path="/admin/orders/:id" element={<RequireAuth role="admin"><AdminLayout><OrderDetail /></AdminLayout></RequireAuth>} />
        <Route path="/admin/products" element={<RequireAuth role="admin"><AdminLayout><Products /></AdminLayout></RequireAuth>} />
        <Route path="/admin/categories" element={<RequireAuth role="admin"><AdminLayout><Categories /></AdminLayout></RequireAuth>} />
        <Route path="/admin/price-tables" element={<RequireAuth role="admin"><AdminLayout><PriceTables /></AdminLayout></RequireAuth>} />
        <Route path="/admin/price-tables/:id/items" element={<RequireAuth role="admin"><AdminLayout><PriceTableEditor /></AdminLayout></RequireAuth>} />
        <Route path="/admin/customers" element={<RequireAuth role="admin"><AdminLayout><Customers /></AdminLayout></RequireAuth>} />
        <Route path="/admin/settings" element={<RequireAuth role="admin"><AdminLayout><Settings /></AdminLayout></RequireAuth>} />
        <Route path="/admin/orders/:id/print" element={<RequireAuth role="admin"><OrderPrint /></RequireAuth>} />

        {/* Cliente */}
        <Route path="/app" element={<RequireAuth role="cliente"><Catalog /></RequireAuth>} />
        <Route path="/app/checkout" element={<RequireAuth role="cliente"><Checkout /></RequireAuth>} />
        <Route path="/app/orders" element={<RequireAuth role="cliente"><MyOrders /></RequireAuth>} />
        <Route path="/app/orders/:id" element={<RequireAuth role="cliente"><MyOrderDetail /></RequireAuth>} />
        <Route path="/app/orders/:id/print" element={<RequireAuth role="cliente"><OrderPrint /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  )
}
