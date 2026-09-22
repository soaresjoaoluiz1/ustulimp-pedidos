import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, DollarSign, Package, Users, TrendingUp, Clock, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { fmtBRL, fmtNumber, fmtRelative, STATUS_LABEL, STATUS_COLOR } from '@/lib/format'
import { Card, Badge } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'

interface DashboardData {
  totals: {
    total_orders: number
    total_revenue: number
    pending_orders: number
    total_customers: number
    total_products: number
    orders_today: number
    orders_30d: number
    revenue_30d: number
  }
  by_status: Array<{ status: string; count: number; total: number }>
  top_products: Array<{ product_id: number; name: string; qty: number; revenue: number }>
  top_customers: Array<{ id: number; name: string; company_name?: string; city?: string; orders_count: number; total_spent: number }>
  recent_orders: Array<{ id: number; order_number: string; status: string; total_value: number; items_count: number; created_at: string; customer_name: string; company_name?: string }>
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardData>('/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>
  if (!data) return null

  const { totals, top_products, top_customers, recent_orders } = data

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio" />

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={<ShoppingCart className="w-5 h-5" />} label="Pedidos" value={totals.total_orders.toString()} hint={`${totals.orders_today} hoje · ${totals.orders_30d} em 30d`} accent="blue" />
        <Kpi icon={<DollarSign className="w-5 h-5" />} label="Faturamento" value={fmtBRL(totals.total_revenue)} hint={`${fmtBRL(totals.revenue_30d)} em 30d`} accent="green" />
        <Kpi icon={<Clock className="w-5 h-5" />} label="Pendentes" value={totals.pending_orders.toString()} hint="aguardando atenção" accent="amber" highlight={totals.pending_orders > 0} />
        <Kpi icon={<Users className="w-5 h-5" />} label="Clientes" value={totals.total_customers.toString()} hint={`${totals.total_products} produtos`} accent="violet" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-navy-800">Pedidos recentes</h2>
            <Link to="/admin/orders" className="text-xs font-semibold text-brand-blue hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recent_orders.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">Nenhum pedido ainda.</div>
          ) : (
            <div className="space-y-2">
              {recent_orders.map(o => (
                <Link
                  key={o.id}
                  to={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-navy-800 truncate">
                      {o.order_number} · {o.customer_name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {o.company_name && <>{o.company_name} · </>}
                      {fmtNumber(o.items_count)} itens · {fmtRelative(o.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    <div className="font-display font-bold text-sm text-navy-800 w-24 text-right">{fmtBRL(o.total_value)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Top */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h2 className="font-display font-bold text-navy-800">Top produtos</h2>
            </div>
            {top_products.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">Sem dados ainda.</div>
            ) : (
              <ul className="space-y-2">
                {top_products.slice(0, 5).map((p, i) => (
                  <li key={p.product_id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-800 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{fmtNumber(p.qty)} un · {fmtBRL(p.revenue)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-brand-blue" />
              <h2 className="font-display font-bold text-navy-800">Top clientes</h2>
            </div>
            {top_customers.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">Sem dados ainda.</div>
            ) : (
              <ul className="space-y-2">
                {top_customers.slice(0, 5).map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-800 truncate">{c.company_name || c.name}</div>
                      <div className="text-xs text-slate-500">{c.orders_count} pedidos · {fmtBRL(c.total_spent)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

function Kpi({ icon, label, value, hint, accent, highlight }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent: 'blue' | 'green' | 'amber' | 'violet'; highlight?: boolean }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600'
  }
  return (
    <Card className={`p-5 ${highlight ? 'ring-2 ring-amber-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="font-display text-2xl sm:text-3xl font-extrabold text-navy-800 mt-1 truncate">{value}</div>
          {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors[accent]} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      </div>
    </Card>
  )
}
