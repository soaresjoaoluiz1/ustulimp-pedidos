import { useNavigate } from 'react-router-dom'
import { X, Plus, Minus, Trash2, ShoppingCart, Package, Box, AlertCircle } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'
import { fmtBRL, fmtNumber } from '@/lib/format'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CartSidebar({ open, onClose }: Props) {
  const { items, subtotal, totalQty, totalPeso, totalVolume, updateQty, removeItem, clear } = useCart()
  const { customer } = useAuth()
  const navigate = useNavigate()
  const minimumOrderValue = (customer as any)?.effective_minimum_order_value
    || (customer as any)?.minimum_order_value
    || 0
  const belowMinimum = minimumOrderValue > 0 && subtotal < minimumOrderValue

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  function checkout() {
    onClose()
    navigate('/app/checkout')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-navy-700" />
            <h2 className="font-display font-bold text-lg text-navy-800">Carrinho</h2>
            {totalQty > 0 && (
              <span className="bg-brand-cyan text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalQty}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-display font-bold text-navy-800 mb-1">Carrinho vazio</h3>
            <p className="text-sm text-slate-500">Adicione produtos do catálogo pra começar.</p>
            <Button variant="secondary" className="mt-4" onClick={onClose}>Continuar comprando</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {items.map(item => (
                <div key={item.product_id} className="flex gap-3 p-3 hover:bg-slate-50 rounded-lg">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Box className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-navy-800 line-clamp-2 leading-snug">{item.name}</div>
                    <div className="text-xs text-slate-500">SKU {item.sku || '—'} · {fmtBRL(item.price)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-slate-100 rounded-md">
                        <button onClick={() => updateQty(item.product_id, item.quantity - 1)} className="w-7 h-7 hover:bg-slate-200 rounded-l-md flex items-center justify-center">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateQty(item.product_id, parseInt(e.target.value || '0', 10))}
                          className="w-10 text-center text-sm font-bold bg-transparent outline-none"
                        />
                        <button onClick={() => updateQty(item.product_id, item.quantity + 1)} className="w-7 h-7 hover:bg-slate-200 rounded-r-md flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="font-display font-bold text-navy-800 text-sm flex-1 text-right">
                        {fmtBRL(item.price * item.quantity)}
                      </div>
                      <button onClick={() => removeItem(item.product_id)} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals + checkout */}
            <div className="border-t border-slate-100 p-4 space-y-3 flex-shrink-0 bg-slate-50">
              <div className="bg-white rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{totalQty} {totalQty === 1 ? 'item' : 'itens'}</span>
                  <span className="font-semibold">{fmtBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" />Peso</span>
                  <span>{fmtNumber(totalPeso, 2)} kg</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Box className="w-3 h-3" />Volume</span>
                  <span>{fmtNumber(totalVolume, 4)} m³</span>
                </div>
              </div>

              <div className="flex items-center justify-between font-display">
                <span className="text-slate-700 font-semibold">Total</span>
                <span className="text-2xl font-extrabold text-navy-800">{fmtBRL(subtotal)}</span>
              </div>

              {belowMinimum && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Pedido mínimo: {fmtBRL(minimumOrderValue)}</div>
                    <div>Faltam <strong>{fmtBRL(minimumOrderValue - subtotal)}</strong> pra finalizar.</div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} className="flex-1">Continuar</Button>
                <Button
                  onClick={checkout}
                  className="flex-[2]"
                  disabled={belowMinimum}
                  title={belowMinimum ? `Pedido mínimo: ${fmtBRL(minimumOrderValue)}` : undefined}
                >
                  Finalizar pedido
                </Button>
              </div>

              <button onClick={() => { if (confirm('Limpar carrinho?')) clear() }} className="text-xs text-slate-400 hover:text-red-500 w-full text-center">
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
