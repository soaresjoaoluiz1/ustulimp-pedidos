import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { fmtBRL, fmtNumber, fmtDateTime, STATUS_LABEL } from '@/lib/format'
import { Button } from '@/components/ui'
import Logo from '@/components/Logo'
import { COMPANY } from '@/lib/company'

/**
 * Página de impressão. Funciona pros dois lados:
 *   - Admin: /admin/orders/:id/print
 *   - Cliente: /app/orders/:id/print
 * Detecta o role do user e usa o endpoint apropriado.
 */
export default function OrderPrint() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const auto = searchParams.get('auto') === '1'

  useEffect(() => {
    if (!user) return
    const path = user.role === 'admin' ? `/admin/orders/${id}` : `/orders/${id}`
    api.get(path).then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [id, user])

  useEffect(() => {
    if (auto && data) {
      const t = setTimeout(() => window.print(), 500)
      return () => clearTimeout(t)
    }
  }, [auto, data])

  if (loading || !data) return <div className="p-8 text-sm text-slate-500">Carregando…</div>

  const { order, items } = data

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Toolbar (não imprime) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-navy-800">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Folha A4 */}
      <div className="max-w-[210mm] mx-auto bg-white my-8 p-12 shadow-lg print:shadow-none print:my-0 print:p-8 text-slate-800">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-navy-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Logo size="sm" />
              <div className="text-[10px] uppercase tracking-wider text-slate-500 border-l border-slate-300 pl-3">Pedido</div>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {COMPANY.name} · CNPJ {COMPANY.cnpj}<br />
              {COMPANY.address}
              {(COMPANY.whatsappLabel || COMPANY.email) && <><br />{[COMPANY.whatsappLabel, COMPANY.email].filter(Boolean).join(' · ')}</>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Pedido</div>
            <div className="font-display text-2xl font-extrabold text-navy-800">{order.order_number}</div>
            <div className="text-xs text-slate-500 mt-1">{fmtDateTime(order.created_at)}</div>
            <div className="inline-block mt-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
              {STATUS_LABEL[order.status]}
            </div>
          </div>
        </div>

        {/* Cliente + Pagamento (2 colunas) */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Cliente</div>
            <div className="font-bold text-base text-navy-800">{order.company_name || order.customer_name}</div>
            {order.company_name && <div className="text-sm">{order.customer_name}</div>}
            <div className="text-xs text-slate-600 space-y-0.5 mt-2">
              {order.document && <div>{(order.document_type || '').toUpperCase()} {order.document}</div>}
              {order.address && <div>{order.address}</div>}
              {order.city && <div>{order.city}/{order.state}</div>}
              {(order.phone || order.whatsapp) && <div>📞 {order.whatsapp || order.phone}</div>}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Pagamento & Entrega</div>
            <div className="space-y-1 text-sm">
              <div><span className="text-slate-500">Tabela:</span> <strong>{order.price_table_name}</strong></div>
              <div><span className="text-slate-500">Prazo:</span> <strong>{order.payment_term || '—'}</strong></div>
              <div><span className="text-slate-500">Forma:</span> <strong className="capitalize">{order.payment_method || '—'}</strong></div>
              <div className="pt-2 mt-2 border-t border-slate-100">
                <div className="text-slate-500">Peso bruto: <strong>{fmtNumber(order.peso_total_kg, 2)} kg</strong></div>
                {order.volume_total_m3 > 0 && <div className="text-slate-500">Volume: <strong>{fmtNumber(order.volume_total_m3, 4)} m³</strong></div>}
              </div>
            </div>
          </div>
        </div>

        {/* Itens */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-navy-800 text-white text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-2 font-bold">SKU</th>
              <th className="text-left px-3 py-2 font-bold">Produto</th>
              <th className="text-center px-3 py-2 font-bold">Qtd</th>
              <th className="text-right px-3 py-2 font-bold">Unit.</th>
              <th className="text-right px-3 py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => (
              <tr key={it.id} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                <td className="px-3 py-2 font-mono text-xs">{it.product_sku_snapshot || '—'}</td>
                <td className="px-3 py-2">{it.product_name_snapshot}</td>
                <td className="px-3 py-2 text-center font-bold">{fmtNumber(it.quantity)}</td>
                <td className="px-3 py-2 text-right">{fmtBRL(it.unit_price_snapshot)}</td>
                <td className="px-3 py-2 text-right font-bold">{fmtBRL(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy-800">
              <td colSpan={4} className="px-3 py-3 text-right font-bold text-base">TOTAL</td>
              <td className="px-3 py-3 text-right font-display text-2xl font-extrabold text-navy-800">{fmtBRL(order.total_value)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Observações */}
        {order.notes && (
          <div className="border border-slate-200 rounded-lg p-3 mb-4 bg-slate-50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Observações do cliente</div>
            <div className="text-sm whitespace-pre-wrap">{order.notes}</div>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center text-xs text-slate-500 pt-6 mt-8 border-t border-slate-200">
          Documento gerado automaticamente · {fmtDateTime(new Date().toISOString())}<br />
          Este documento é uma cópia do pedido. Não substitui nota fiscal.
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
