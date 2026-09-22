import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, ChevronRight, ShoppingCart } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, Button, EmptyState } from '@/components/ui'
import CustomerLayout from '@/components/customer/CustomerLayout'
import CartSidebar from '@/components/customer/CartSidebar'
import { fmtBRL, fmtNumber, fmtRelative, STATUS_LABEL, STATUS_COLOR } from '@/lib/format'

interface Order {
  id: number
  order_number: string
  status: string
  total_value: number
  items_count: number
  payment_term?: string
  payment_method?: string
  created_at: string
}

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [cartOpen, setCartOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get<{ orders: Order[] }>('/orders')
      .then(d => setOrders(d.orders))
      .finally(() => setLoading(false))
  }, [])

  return (
    <CustomerLayout onCartClick={() => setCartOpen(true)}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-navy-800">Meus pedidos</h1>
            <p className="text-sm text-slate-500 mt-1">Acompanhe seus pedidos e status de entrega</p>
          </div>
          <Button onClick={() => navigate('/app')}>
            <ShoppingCart className="w-4 h-4" /> Novo pedido
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Carregando…</div>
        ) : orders.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Package className="w-7 h-7" />}
              title="Nenhum pedido ainda"
              description="Quando você fizer pedidos, eles vão aparecer aqui."
              action={<Button onClick={() => navigate('/app')}>Ver catálogo</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <Link
                key={o.id}
                to={`/app/orders/${o.id}`}
                className="block bg-white rounded-xl shadow-card hover:shadow-card-hover transition p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-extrabold text-navy-800">{o.order_number}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtNumber(o.items_count)} {o.items_count === 1 ? 'item' : 'itens'}
                      {o.payment_term && <> · {o.payment_term}</>}
                      <> · {fmtRelative(o.created_at)}</>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-display font-extrabold text-navy-800">{fmtBRL(o.total_value)}</div>
                    <ChevronRight className="w-4 h-4 text-slate-400 ml-auto mt-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </CustomerLayout>
  )
}
