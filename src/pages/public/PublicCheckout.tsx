import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Package, Tag, Trash2, Plus, Minus, Info, Search, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useCart } from '@/context/CartContext'
import { Button, Card, Input, Textarea, Select, toast } from '@/components/ui'
import { fmtBRL, fmtNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import Logo from '@/components/Logo'
import { COMPANY, waLink } from '@/lib/company'

type PaymentMethod = 'boleto' | 'pix' | 'dinheiro'
const METHOD_LABEL: Record<PaymentMethod, string> = { boleto: 'Boleto', pix: 'PIX', dinheiro: 'Dinheiro' }

interface PaymentTerm { id: number; label: string; days: string; methods: PaymentMethod[] }

const STEPS = [
  { key: 'cart', label: 'Carrinho' },
  { key: 'dados', label: 'Seus dados' },
  { key: 'pagamento', label: 'Pagamento' },
] as const
type StepKey = typeof STEPS[number]['key']

/** 00.000.000/0000-00 ou 000.000.000-00 enquanto digita */
function fmtDoc(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function PublicCheckout() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { items, subtotal, totalQty, totalPeso, updateQty, removeItem, removeMany, updatePrice, clear, setPublicScope, publicScope } = useCart()

  const [step, setStep] = useState<StepKey>('cart')
  const [table, setTable] = useState<{ name: string; minimum_order_value: number } | null>(null)
  const [terms, setTerms] = useState<PaymentTerm[]>([])
  const [paymentTerm, setPaymentTerm] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [done, setDone] = useState<{ order_number: string; total_value: number } | null>(null)
  const openedAt = useRef(Date.now())
  const [honeypot, setHoneypot] = useState('')   // campo escondido: robô preenche, gente não

  const [form, setForm] = useState({
    name: '', company_name: '', document: '', whatsapp: '', email: '',
    address: '', city: '', state: '', zip_code: '',
  })
  const update = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { setPublicScope(token) }, [token])

  /* Carrega a tabela do link e revalida os preços do carrinho */
  useEffect(() => {
    api.get<any>(`/public/catalog/${token}`)
      .then(({ table, products, payment_terms }) => {
        setTable(table)
        setTerms(payment_terms || [])
        const priceById = new Map<number, number>(products.map((p: any) => [p.id, p.price]))
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
      .catch(() => toast.error('Esse link não está mais valendo. Peça um novo ao vendedor.'))
  }, [token])

  /* Carrinho vazio volta pro catálogo — só depois que o carrinho DESTE link foi carregado,
     senão o primeiro render (ainda sem escopo) mandaria todo mundo de volta. */
  useEffect(() => {
    if (publicScope === token && items.length === 0 && !done) navigate(`/c/${token}`)
  }, [publicScope, items, done, navigate, token])

  const selectedTerm = terms.find(t => t.label === paymentTerm) || null
  const allowedMethods: PaymentMethod[] = selectedTerm?.methods || []
  useEffect(() => {
    if (!selectedTerm) { setPaymentMethod(''); return }
    setPaymentMethod(prev => (prev && allowedMethods.includes(prev)) ? prev : (allowedMethods[0] || ''))
  }, [paymentTerm, terms])

  const minimum = table?.minimum_order_value || 0
  const belowMinimum = minimum > 0 && subtotal < minimum
  const dadosOk = useMemo(() => (
    form.name.trim().length >= 3 &&
    form.document.replace(/\D/g, '').length >= 11 &&
    form.whatsapp.replace(/\D/g, '').length >= 10 &&
    form.address.trim().length >= 5 &&
    form.city.trim().length >= 2 &&
    form.state.trim().length === 2
  ), [form])

  async function buscarCnpj() {
    const digits = form.document.replace(/\D/g, '')
    if (digits.length !== 14) { toast.error('Digite os 14 números do CNPJ'); return }
    setLookingUp(true)
    try {
      const d = await api.get<any>(`/public/cnpj/${token}/${digits}`)
      setForm(f => ({
        ...f,
        company_name: f.company_name || d.company_name || '',
        name: f.name || d.contact_suggestion || '',
        address: f.address || d.address || '',
        city: f.city || d.city || '',
        state: f.state || d.state || '',
        zip_code: f.zip_code || d.zip_code || '',
        whatsapp: f.whatsapp || d.phone || '',
      }))
      toast.success('Dados da empresa preenchidos')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível consultar o CNPJ')
    } finally { setLookingUp(false) }
  }

  async function enviar() {
    if (belowMinimum) { toast.error(`Pedido mínimo de ${fmtBRL(minimum)}.`); return }
    if (!paymentTerm || !paymentMethod) { toast.error('Escolha o prazo e a forma de pagamento'); return }
    setSubmitting(true)
    try {
      const res = await api.post<{ order_number: string; total_value: number }>(`/public/orders/${token}`, {
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        customer: { ...form, document: form.document.replace(/\D/g, '') },
        payment_term: paymentTerm,
        payment_method: paymentMethod,
        notes: notes || null,
        elapsed_ms: Date.now() - openedAt.current,
        _hp: honeypot || undefined,
      })
      clear()
      setDone(res)
    } catch (err: any) {
      const ids = err?.data?.product_ids
      if (Array.isArray(ids) && ids.length) {
        removeMany(ids)
        toast.error(`${err.message} Já tiramos do seu carrinho.`)
        setStep('cart')
      } else {
        toast.error(err.message || 'Não foi possível enviar o pedido')
      }
    } finally { setSubmitting(false) }
  }

  /* ── Pedido enviado ── */
  if (done) {
    const msg = `Olá! Acabei de enviar o pedido ${done.order_number} pelo catálogo.`
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-navy-800 mb-1">Pedido enviado!</h1>
          <p className="text-sm text-slate-500 mb-5">
            Guarde o número <b className="text-navy-800">{done.order_number}</b>. Um consultor da {COMPANY.name} entra
            em contato pra confirmar entrega e pagamento.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-5 text-left text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Total</span><b className="text-navy-800">{fmtBRL(done.total_value)}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Entrega</span><span className="text-navy-800 text-right">{form.address}, {form.city}/{form.state}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pagamento</span><span className="text-navy-800">{paymentTerm} · {METHOD_LABEL[paymentMethod as PaymentMethod]}</span></div>
          </div>
          <div className="space-y-2">
            {waLink(msg) && (
              <a href={waLink(msg)!} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="success" className="w-full" size="lg">Falar no WhatsApp</Button>
              </a>
            )}
            <Link to={`/c/${token}`} className="block">
              <Button variant="secondary" className="w-full">Fazer outro pedido</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (publicScope !== token) return null
  if (items.length === 0) return null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to={`/c/${token}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-navy-800">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Continuar comprando</span>
          </Link>
          <Logo size="sm" />
          <Stepper step={step} />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {step === 'cart' && (
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-display text-lg font-bold text-navy-800">{totalQty} {totalQty === 1 ? 'caixa' : 'caixas'} no carrinho</h2>
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
                          {fmtBRL(item.price)}/cx{item.units_per_box ? ` · caixa c/ ${item.units_per_box} un.` : ''}
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
                      <div className="text-right font-display font-bold text-navy-800">{fmtBRL(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 'dados' && (
              <Card className="p-5 space-y-3">
                <h2 className="font-display text-lg font-bold text-navy-800">Seus dados e entrega</h2>
                <p className="text-xs text-slate-500 -mt-2">
                  Não precisa criar senha. Usamos esses dados pra emitir o pedido e combinar a entrega.
                </p>

                <div className="flex items-end gap-2">
                  <Input
                    label="CNPJ ou CPF *"
                    value={form.document}
                    onChange={e => update('document', fmtDoc(e.target.value))}
                    onBlur={() => form.document.replace(/\D/g, '').length === 14 && buscarCnpj()}
                    placeholder="00.000.000/0000-00"
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={buscarCnpj} loading={lookingUp} className="h-10 whitespace-nowrap">
                    <Search className="w-4 h-4" /> Buscar
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Seu nome *" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Quem está comprando" />
                  <Input label="Empresa" value={form.company_name} onChange={e => update('company_name', e.target.value)} />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="WhatsApp *" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="(14) 99999-9999" />
                  <Input label="E-mail (opcional)" type="email" value={form.email} onChange={e => update('email', e.target.value)} hint="Pra receber a confirmação do pedido" />
                </div>

                <Input label="Endereço de entrega *" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Rua, número, bairro" />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="CEP" value={form.zip_code} onChange={e => update('zip_code', e.target.value)} />
                  <Input label="Cidade *" value={form.city} onChange={e => update('city', e.target.value)} />
                  <Input label="UF *" value={form.state} onChange={e => update('state', e.target.value.toUpperCase())} maxLength={2} />
                </div>

                {/* Armadilha pra robô: fica escondido, gente nunca preenche */}
                <input
                  type="text" tabIndex={-1} autoComplete="off" value={honeypot}
                  onChange={e => setHoneypot(e.target.value)}
                  aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
                />

                <p className="text-[11px] text-slate-400">
                  Ao enviar, você concorda que a {COMPANY.name} use esses dados pra emitir e entregar o pedido.
                </p>
              </Card>
            )}

            {step === 'pagamento' && (
              <Card className="p-5 space-y-3">
                <h2 className="font-display text-lg font-bold text-navy-800">Forma de pagamento</h2>

                <Select label="Prazo de pagamento *" value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)}>
                  <option value="">Selecione…</option>
                  {terms.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
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
                            key={m} type="button" onClick={() => setPaymentMethod(m)} aria-pressed={paymentMethod === m}
                            className={cn(
                              'py-2.5 px-3 rounded-lg border-2 text-sm font-semibold transition',
                              paymentMethod === m ? 'border-navy-800 bg-navy-50 text-navy-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
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

                <Textarea label="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Ex: entregar pela manhã, falar com o encarregado..." />

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div><strong>Sem pagamento online:</strong> ao enviar, um consultor entra em contato pra confirmar a entrega e passar as instruções de pagamento.</div>
                </div>
              </Card>
            )}
          </div>

          {/* Resumo */}
          <aside className="space-y-3">
            <Card className="p-5">
              <h3 className="font-display font-bold text-navy-800 mb-3">Resumo</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({totalQty} {totalQty === 1 ? 'caixa' : 'caixas'})</span>
                  <span className="font-semibold">{fmtBRL(subtotal)}</span>
                </div>
                {table?.name && (
                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />Tabela</span>
                    <span className="font-semibold">{table.name}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 mb-4 flex justify-between items-baseline">
                <span className="text-sm text-slate-700">Total</span>
                <span className="font-display text-2xl font-extrabold text-navy-800">{fmtBRL(subtotal)}</span>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600 flex justify-between">
                <span className="flex items-center gap-1"><Package className="w-3 h-3" />Peso bruto</span>
                <span className="font-semibold">{fmtNumber(totalPeso, 2)} kg</span>
              </div>

              {belowMinimum && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 mb-3">
                  <div className="font-bold mb-0.5">⚠ Pedido mínimo: {fmtBRL(minimum)}</div>
                  <div>Faltam <strong>{fmtBRL(minimum - subtotal)}</strong> pra finalizar.</div>
                </div>
              )}

              {step === 'cart' && (
                <Button onClick={() => setStep('dados')} className="w-full" size="lg" disabled={belowMinimum}>
                  {belowMinimum ? `Faltam ${fmtBRL(minimum - subtotal)}` : 'Continuar'}
                  {!belowMinimum && <ArrowRight className="w-4 h-4" />}
                </Button>
              )}
              {step === 'dados' && (
                <div className="space-y-2">
                  <Button onClick={() => setStep('pagamento')} className="w-full" size="lg" disabled={!dadosOk}>
                    {dadosOk ? 'Ir pro pagamento' : 'Preencha os campos com *'}
                    {dadosOk && <ArrowRight className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => setStep('cart')} variant="ghost" className="w-full">Voltar ao carrinho</Button>
                </div>
              )}
              {step === 'pagamento' && (
                <div className="space-y-2">
                  <Button onClick={enviar} loading={submitting} disabled={belowMinimum || !paymentTerm || !paymentMethod} className="w-full" size="lg" variant="success">
                    <Check className="w-4 h-4" /> Enviar pedido
                  </Button>
                  <Button onClick={() => setStep('dados')} variant="ghost" className="w-full">Voltar</Button>
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
            i < idx ? 'text-emerald-700' : i === idx ? 'bg-navy-800 text-white' : 'text-slate-400'
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
