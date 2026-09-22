import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Package, Box, MessageSquare, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, Button } from '@/components/ui'
import CustomerLayout from '@/components/customer/CustomerLayout'
import CartSidebar from '@/components/customer/CartSidebar'
import { fmtBRL, fmtNumber, fmtDateTime, STATUS_LABEL, STATUS_COLOR } from '@/lib/format'
import { waLink } from '@/lib/company'

export default function MyOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const justConfirmed = searchParams.get('confirmed') === '1'
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    api.get<{ order: any; items: any[] }>(`/orders/${id}`)
      .then(setData)
      .catch(err => setError(err.message || 'Não foi possível abrir esse pedido'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <CustomerLayout onCartClick={() => setCartOpen(true)}>
        <div className="max-w-3xl mx-auto px-4 py-8 text-sm text-slate-500">Carregando…</div>
      </CustomerLayout>
    )
  }

  if (!data) {
    return (
      <CustomerLayout onCartClick={() => setCartOpen(true)}>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h1 className="font-display text-xl font-bold text-navy-800 mb-2">Pedido não encontrado</h1>
          <p className="text-sm text-slate-500 mb-5">{error || 'Esse pedido não existe ou não é da sua conta.'}</p>
          <Link to="/app/orders"><Button>Ver meus pedidos</Button></Link>
        </div>
      </CustomerLayout>
    )
  }
  const { order, items } = data

  return (
    <CustomerLayout onCartClick={() => setCartOpen(true)}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/app/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-navy-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Meus pedidos
        </Link>

        {/* Confirmation banner */}
        {justConfirmed && (
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 mb-6 border-0">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-1">Pedido enviado com sucesso! 🎉</h2>
                <p className="text-white/90 text-sm">
                  Seu pedido <strong>{order.order_number}</strong> foi recebido. Um consultor da Ustulimp vai entrar em contato pelo WhatsApp em horário comercial pra confirmar e alinhar a entrega.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-navy-800">{order.order_number}</h1>
            <p className="text-xs text-slate-500 mt-1">{fmtDateTime(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span>
            <Link to={`/app/orders/${order.id}/print`}>
              <Button variant="secondary" size="sm"><Printer className="w-4 h-4" />PDF</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {/* Items */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-display font-bold text-navy-800">{items.length} {items.length === 1 ? 'item' : 'itens'}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((it: any) => (
                <div key={it.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-navy-800 truncate">{it.product_name_snapshot}</div>
                    <div className="text-xs text-slate-500">SKU {it.product_sku_snapshot || '—'} · {fmtNumber(it.quantity)} × {fmtBRL(it.unit_price_snapshot)}</div>
                  </div>
                  <div className="font-display font-bold text-navy-800 text-sm flex-shrink-0">{fmtBRL(it.subtotal)}</div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                <Package className="w-3 h-3 inline mr-1" />Peso {fmtNumber(order.peso_total_kg, 2)}kg
                {order.volume_total_m3 > 0 && (<> · <Box className="w-3 h-3 inline mx-1" />Volume {fmtNumber(order.volume_total_m3, 4)}m³</>)}
              </div>
              <div className="font-display text-2xl font-extrabold text-navy-800">{fmtBRL(order.total_value)}</div>
            </div>
          </Card>

          {/* Pagamento */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-navy-800 mb-2">Pagamento</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Prazo</div>
                <div className="font-semibold text-navy-800">{order.payment_term || 'A definir'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Forma</div>
                <div className="font-semibold text-navy-800 capitalize">{order.payment_method || 'A definir'}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Tabela: <strong className="text-navy-700">{order.price_table_name}</strong>
            </div>
          </Card>

          {/* Observações */}
          {order.notes && (
            <Card className="p-5">
              <h3 className="font-display font-bold text-navy-800 mb-2">Suas observações</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
            </Card>
          )}

          {/* CTA WhatsApp */}
          {waLink('') && (
            <Card className="p-5 text-center bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <MessageSquare className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-display font-bold text-navy-800 mb-1">Precisa falar com o consultor?</h3>
              <p className="text-sm text-slate-600 mb-3">Tire dúvidas sobre seu pedido pelo WhatsApp.</p>
              <a
                href={waLink(`Olá! Quero falar sobre meu pedido ${order.order_number} no portal da USTULIMP.`)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="success">
                  <MessageSquare className="w-4 h-4" /> Falar no WhatsApp
                </Button>
              </a>
            </Card>
          )}
        </div>
      </div>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </CustomerLayout>
  )
}
