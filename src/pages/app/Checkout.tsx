import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Package, Box, Tag, Trash2, Plus, Minus, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, Textarea, Select, toast, Modal } from '@/components/ui'
import { fmtBRL, fmtNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

interface PaymentTerm {
  id: number
  label: string
  days: string
  /** Formas de pagamento que o prazo aceita (vem do server) */
  methods: PaymentMethod[]
}

type PaymentMethod = 'boleto' | 'pix' | 'dinheiro'
const METHOD_LABEL: Record<PaymentMethod, string> = { boleto: 'Boleto', pix: 'PIX', dinheiro: 'Dinheiro' }

const STEPS = [
  { key: 'cart',    label: 'Carrinho' },
  { key: 'payment', label: 'Pagamento' },
  { key: 'done',    label: 'Confirmar' }
] as const
type StepKey = typeof STEPS[number]['key']

export default function Checkout() {
  const navigate = useNavigate()
  const { customer, refresh } = useAuth()
  const { items, subtotal, totalQty, totalPeso, totalVolume, updateQty, updatePrice, removeItem, removeMany, clear } = useCart()
  const [step, setStep] = useState<StepKey>('cart')
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [paymentTerm, setPaymentTerm] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get<{ payment_terms: PaymentTerm[] }>('/orders/_/payment-terms')
      .then(d => setPaymentTerms(d.payment_terms))
      .catch(() => {})
    /* Recarrega os dados do cliente: o admin pode ter mudado o pedido mínimo
       ou a tabela depois que ele logou. */
    refresh()

    /* Revalida o carrinho contra o catálogo: preço mudado é atualizado e produto que
       saiu da tabela é removido — senão o cliente confirma um total que o servidor recusa. */
    api.get<{ products: { id: number; price: number }[] }>('/catalog')
      .then(({ products }) => {
        const priceById = new Map(products.map(p => [p.id, p.price]))
        const sumiram = items.filter(i => !priceById.has(i.product_id)).map(i => i.product_id)
        const mudaram = items.filter(i => priceById.has(i.product_id) && priceById.get(i.product_id) !== i.price)
        if (sumiram.length) {
          removeMany(sumiram)
          toast.error(`${sumiram.length === 1 ? 'Um produto saiu' : `${sumiram.length} produtos saíram`} do catálogo e ${sumiram.length === 1 ? 'foi removido' : 'foram removidos'} do carrinho.`)
        }
        if (mudaram.length) {
          mudaram.forEach(i => updatePrice(i.product_id, priceById.get(i.product_id)!))
          toast.info(`Preço atualizado em ${mudaram.length} ${mudaram.length === 1 ? 'produto' : 'produtos'}.`)
        }
      })
      .catch(() => {})
  }, [])

  const selectedTerm = paymentTerms.find(t => t.label === paymentTerm) || null
  const allowedMethods: PaymentMethod[] = selectedTerm?.methods || []

  /* Trocou o prazo: a forma de pagamento acompanha (e escolhe sozinha quando só tem uma). */
  useEffect(() => {
    if (!selectedTerm) { setPaymentMethod(''); return }
    setPaymentMethod(prev => (prev && allowedMethods.includes(prev)) ? prev : (allowedMethods[0] || ''))
  }, [paymentTerm, paymentTerms])

  /* Redireciona pro catálogo se carrinho vazio */
  useEffect(() => {
    if (items.length === 0 && step !== 'done') navigate('/app')
  }, [items, step, navigate])

  /* Pedido mínimo efetivo: override do cliente OU mínimo da tabela */
  const minimumOrderValue = (customer as any)?.effective_minimum_order_value
    || (customer as any)?.minimum_order_value
    || 0
  const belowMinimum = minimumOrderValue > 0 && subtotal < minimumOrderValue

  async function submit() {
    if (!paymentTerm) { toast.error('Escolha um prazo de pagamento'); return }
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      toast.error('Escolha uma forma de pagamento válida pro prazo selecionado'); return
    }
    if (belowMinimum) {
      toast.error(`Pedido mínimo de ${fmtBRL(minimumOrderValue)}. Adicione mais produtos.`)
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post<{ id: number; order_number: string }>('/orders', {
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_term: paymentTerm,
        payment_method: paymentMethod,
        notes: notes || null
      })
      clear()
      navigate(`/app/orders/${res.id}?confirmed=1`, { replace: true })
    } catch (err: any) {
      /* Produto saiu do catálogo/da tabela no meio da compra: tira do carrinho pra não travar o cliente */
      const ids = err?.data?.product_ids
      if (Array.isArray(ids) && ids.length) {
        removeMany(ids)
        toast.error(`${err.message} Já tiramos do seu carrinho.`)
        setStep('cart')
      } else {
        toast.error(err.message)
      }
    } finally { setSubmitting(false) }
  }

  if (items.length === 0) return null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-navy-800">
            <ArrowLeft className="w-4 h-4" /> Continuar comprando
          </Link>
          <Stepper step={step} />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conteúdo principal */}
          <div className="lg:col-span-2 space-y-4">
            {step === 'cart' && (
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-navy-800">{totalQty} {totalQty === 1 ? 'item' : 'itens'} no carrinho</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(item => (
                    <div key={item.product_id} className="flex gap-4 p-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center flex-shrink-0">
                        {item.image_url ? <img src={item.image_url} className="w-full h-full object-contain p-2" /> : <Package className="w-6 h-6 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-navy-800 line-clamp-2">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          SKU {item.sku || '—'} · {fmtBRL(item.price)}/cx
                          {item.units_per_box ? ` · caixa c/ ${item.units_per_box} un.` : ''}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center bg-slate-100 rounded-md">
                            <button onClick={() => updateQty(item.product_id, item.quantity - 1)} className="w-7 h-7 hover:bg-slate-200 rounded-l-md flex items-center justify-center">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input type="number" min={1} max={999} value={item.quantity} onChange={e => updateQty(item.product_id, Number(e.target.value))} className="w-12 text-center text-sm font-bold bg-transparent outline-none" />
                            <button onClick={() => updateQty(item.product_id, item.quantity + 1)} className="w-7 h-7 hover:bg-slate-200 rounded-r-md flex items-center justify-center">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => removeItem(item.product_id)} className="text-slate-400 hover:text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-navy-800">{fmtBRL(item.price * item.quantity)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 'payment' && (
              <Card className="p-5">
                <h2 className="font-display text-lg font-bold text-navy-800 mb-4">Forma de pagamento</h2>

                <div className="space-y-3">
                  <Select label="Prazo de pagamento *" value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)}>
                    <option value="">Selecione…</option>
                    {paymentTerms.map(pt => <option key={pt.id} value={pt.label}>{pt.label}</option>)}
                  </Select>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Como pretende pagar?</label>
                    {!selectedTerm ? (
                      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                        Escolha o prazo acima pra ver as formas de pagamento.
                      </div>
                    ) : (
                      <>
                        <div className={cn('grid gap-2', allowedMethods.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                          {allowedMethods.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPaymentMethod(m)}
                              aria-pressed={paymentMethod === m}
                              className={cn(
                                'py-2.5 px-3 rounded-lg border-2 text-sm font-semibold transition',
                                paymentMethod === m
                                  ? 'border-navy-800 bg-navy-50 text-navy-800'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              )}
                            >
                              {METHOD_LABEL[m]}
                            </button>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5">
                          {allowedMethods.includes('boleto')
                            ? `"${selectedTerm.label}" é pagamento a prazo, então vai por boleto.`
                            : `"${selectedTerm.label}" é pagamento à vista: ${allowedMethods.map(m => METHOD_LABEL[m]).join(' ou ')}.`}
                        </div>
                      </>
                    )}
                  </div>

                  <Textarea
                    label="Observações (opcional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ex: entregar pela manhã, deixar com porteiro..."
                    rows={3}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Pagamento offline:</strong> ao confirmar, um consultor entra em contato pelo WhatsApp pra alinhar entrega e instruções de pagamento.
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Resumo lateral */}
          <aside className="space-y-3">
            <Card className="p-5">
              <h3 className="font-display font-bold text-navy-800 mb-3">Resumo</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({totalQty} {totalQty === 1 ? 'item' : 'itens'})</span>
                  <span className="font-semibold">{fmtBRL(subtotal)}</span>
                </div>
                {customer?.price_table_name && (
                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />Tabela</span>
                    <span className="font-semibold">{customer.price_table_name}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 mb-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-700">Total</span>
                  <span className="font-display text-2xl font-extrabold text-navy-800">{fmtBRL(subtotal)}</span>
                </div>
              </div>

              {/* Resumo transporte */}
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Resumo para transporte</div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" />Peso bruto</span>
                  <span className="font-semibold">{fmtNumber(totalPeso, 2)} kg</span>
                </div>
                {totalVolume > 0 && (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Box className="w-3 h-3" />Volume</span>
                    <span className="font-semibold">{fmtNumber(totalVolume, 4)} m³</span>
                  </div>
                )}
              </div>

              {belowMinimum && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 mb-3">
                  <div className="font-bold mb-0.5">⚠ Pedido mínimo: {fmtBRL(minimumOrderValue)}</div>
                  <div>Faltam <strong>{fmtBRL(minimumOrderValue - subtotal)}</strong> pra você poder finalizar.</div>
                </div>
              )}

              {step === 'cart' && (
                <Button
                  onClick={() => setStep('payment')}
                  className="w-full"
                  size="lg"
                  disabled={belowMinimum}
                  title={belowMinimum ? `Pedido mínimo: ${fmtBRL(minimumOrderValue)}` : undefined}
                >
                  {belowMinimum ? `Faltam ${fmtBRL(minimumOrderValue - subtotal)}` : 'Definir pagamento'}
                  {!belowMinimum && <ArrowRight className="w-4 h-4" />}
                </Button>
              )}
              {step === 'payment' && (
                <div className="space-y-2">
                  <Button
                    onClick={submit}
                    loading={submitting}
                    disabled={belowMinimum || !paymentTerm || !paymentMethod}
                    className="w-full"
                    size="lg"
                    variant="success"
                  >
                    <Check className="w-4 h-4" /> Confirmar pedido
                  </Button>
                  <Button onClick={() => setStep('cart')} variant="ghost" className="w-full">
                    Voltar ao carrinho
                  </Button>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Stepper({ step }: { step: StepKey }) {
  const idx = STEPS.findIndex(s => s.key === step)
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
            i < idx ? 'text-emerald-700' :
            i === idx ? 'bg-navy-800 text-white' :
            'text-slate-400'
          )}>
            {i < idx && <Check className="w-3 h-3" />}
            {s.label}
          </div>
          {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
        </div>
      ))}
    </div>
  )
}
