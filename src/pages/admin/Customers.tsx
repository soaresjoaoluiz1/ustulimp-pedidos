import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Search, Users, KeyRound, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import { Card, Button, Input, Select, Modal, Badge, Textarea, EmptyState, toast } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'
import { fmtBRL, fmtRelative } from '@/lib/format'
import { COMPANY } from '@/lib/company'

/** 00.000.000/0000-00 enquanto digita */
function fmtCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

interface Customer {
  id: number
  user_id?: number
  name: string
  company_name?: string
  email?: string
  document?: string
  document_type?: 'cpf' | 'cnpj'
  phone?: string
  whatsapp?: string
  city?: string
  state?: string
  address?: string
  zip_code?: string
  distance_km?: number
  price_table_id?: number
  price_table_name?: string
  minimum_order_value: number
  notes?: string
  is_active: number
  user_active?: number
  last_login_at?: string
  orders_count: number
  total_spent: number
  allowed_payment_term_ids?: number[] | null
}

interface PriceTable { id: number; name: string }
interface PaymentTerm { id: number; label: string; days: string }

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [priceTables, setPriceTables] = useState<PriceTable[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const [c, pt, ptms] = await Promise.all([
        api.get<{ customers: Customer[] }>(`/admin/customers${params.toString() ? '?' + params : ''}`),
        api.get<{ price_tables: PriceTable[] }>('/admin/price-tables'),
        api.get<{ payment_terms: PaymentTerm[] }>('/admin/payment-terms')
      ])
      setCustomers(c.customers)
      setPriceTables(pt.price_tables)
      setPaymentTerms(ptms.payment_terms)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  async function resetPassword(c: Customer) {
    if (!confirm(`Gerar nova senha pra ${c.name}? A senha atual ficará inválida.`)) return
    try {
      const res = await api.post<{ temp_password: string }>(`/admin/customers/${c.id}/reset-password`)
      setCredentialsModal({ email: c.email || '', password: res.temp_password })
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} cliente${customers.length !== 1 ? 's' : ''}`}
        action={<Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Novo cliente</Button>}
      />

      <Card className="p-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa, documento ou email…"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-navy-500 focus:bg-white"
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="w-7 h-7" />} title="Nenhum cliente" description="Cadastre seus revendedores pra eles fazerem pedidos online." action={<Button onClick={() => setEditing('new')}>Novo cliente</Button>} />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Localização</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Tabela</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Pedidos</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Total gasto</th>
                  <th className="text-right px-4 py-3 w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy-800">{c.company_name || c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.company_name ? `${c.name} · ` : ''}{c.email}
                        {!c.is_active && <Badge className="bg-slate-100 text-slate-500 ml-2">Inativo</Badge>}
                        {c.last_login_at && <span className="ml-2">· último: {fmtRelative(c.last_login_at)}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600 text-sm">
                      {c.city ? `${c.city}/${c.state || ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {c.price_table_name ? <Badge className="bg-blue-100 text-blue-700">{c.price_table_name}</Badge> : <span className="text-xs text-slate-400">Sem tabela</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-right font-semibold">{c.orders_count}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-right font-semibold text-emerald-600">{fmtBRL(c.total_spent)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => resetPassword(c)} title="Resetar senha"><KeyRound className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)}><Pencil className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <CustomerModal
          customer={editing === 'new' ? null : editing}
          priceTables={priceTables}
          paymentTerms={paymentTerms}
          onClose={() => setEditing(null)}
          onSaved={(creds) => {
            setEditing(null)
            load()
            if (creds) setCredentialsModal(creds)
          }}
        />
      )}

      {credentialsModal && (
        <CredentialsModal
          credentials={credentialsModal}
          onClose={() => setCredentialsModal(null)}
        />
      )}
    </>
  )
}

function CustomerModal({ customer, priceTables, paymentTerms, onClose, onSaved }: { customer: Customer | null; priceTables: PriceTable[]; paymentTerms: PaymentTerm[]; onClose: () => void; onSaved: (creds?: { email: string; password: string }) => void }) {
  const initialAllowed = customer?.allowed_payment_term_ids ?? null
  const [form, setForm] = useState({
    name: customer?.name || '',
    company_name: customer?.company_name || '',
    email: customer?.email || '',
    document: customer?.document || '',
    document_type: customer?.document_type || 'cnpj',
    phone: customer?.phone || '',
    whatsapp: customer?.whatsapp || '',
    city: customer?.city || '',
    state: customer?.state || '',
    address: customer?.address || '',
    zip_code: customer?.zip_code || '',
    distance_km: customer?.distance_km?.toString() || '',
    price_table_id: customer?.price_table_id?.toString() || '',
    minimum_order_value: customer?.minimum_order_value?.toString() || '0',
    notes: customer?.notes || '',
    is_active: customer?.is_active !== 0,
    password: ''
  })
  const [allTermsAllowed, setAllTermsAllowed] = useState<boolean>(initialAllowed === null)
  const [allowedTermIds, setAllowedTermIds] = useState<number[]>(Array.isArray(initialAllowed) ? initialAllowed : [])
  const [saving, setSaving] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [cnpjInfo, setCnpjInfo] = useState<{ status?: string; active?: boolean; main_activity?: string } | null>(null)
  const lastLookup = useRef('')

  /* Puxa os dados da empresa na Receita pelo CNPJ e preenche o formulário.
     Campo que o admin já digitou não é sobrescrito (só com o botão "Buscar"). */
  async function lookupCnpj(raw: string, { force = false } = {}) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 14) {
      if (force) toast.error('Digite os 14 números do CNPJ')
      return
    }
    if (!force && lastLookup.current === digits) return
    lastLookup.current = digits
    setLookingUp(true)
    try {
      const d = await api.get<any>(`/admin/cnpj/${digits}`)
      setForm(f => ({
        ...f,
        document: fmtCnpj(digits),
        document_type: 'cnpj',
        company_name: force || !f.company_name ? (d.company_name || f.company_name) : f.company_name,
        name: f.name || d.contact_suggestion || '',
        address: force || !f.address ? (d.address || f.address) : f.address,
        city: force || !f.city ? (d.city || f.city) : f.city,
        state: force || !f.state ? (d.state || f.state) : f.state,
        zip_code: force || !f.zip_code ? (d.zip_code || f.zip_code) : f.zip_code,
        phone: force || !f.phone ? (d.phone || f.phone) : f.phone,
        whatsapp: f.whatsapp || d.phone || '',
        email: f.email || d.email || '',
      }))
      setCnpjInfo({ status: d.status, active: d.active, main_activity: d.main_activity })
      toast.success(d.active ? 'Dados da empresa preenchidos' : `Empresa encontrada, mas a situação é "${d.status}"`)
    } catch (err: any) {
      setCnpjInfo(null)
      toast.error(err.message || 'Não foi possível consultar o CNPJ')
    } finally { setLookingUp(false) }
  }

  function toggleTerm(id: number) {
    setAllowedTermIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    if (!customer && !form.email.trim()) { toast.error('Email obrigatório pra criar'); return }

    const payload: any = {
      name: form.name,
      company_name: form.company_name || null,
      document: form.document || null,
      document_type: form.document_type,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      city: form.city || null,
      state: form.state || null,
      address: form.address || null,
      zip_code: form.zip_code || null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      price_table_id: form.price_table_id ? Number(form.price_table_id) : null,
      minimum_order_value: Number(form.minimum_order_value) || 0,
      notes: form.notes || null,
      is_active: form.is_active,
      /* null/[] = todos disponíveis · array com IDs = restrito */
      allowed_payment_term_ids: allTermsAllowed ? null : allowedTermIds
    }
    if (!customer) {
      payload.email = form.email
      if (form.password) payload.password = form.password
    }

    setSaving(true)
    try {
      if (customer) {
        await api.put(`/admin/customers/${customer.id}`, payload)
        toast.success('Cliente atualizado')
        onSaved()
      } else {
        const res = await api.post<{ email: string; temp_password: string }>('/admin/customers', payload)
        toast.success('Cliente criado')
        onSaved({ email: res.email, password: res.temp_password })
      }
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={customer ? 'Editar cliente' : 'Novo cliente'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome do contato *" value={form.name} onChange={e => update('name', e.target.value)} />
          <Input label="Empresa / Razão social" value={form.company_name} onChange={e => update('company_name', e.target.value)} />
        </div>

        {!customer && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email (login) *" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
            <Input label="Senha (deixe vazio pra gerar)" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Auto-gerada" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Select label="Tipo doc." value={form.document_type} onChange={e => update('document_type', e.target.value as any)}>
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
          </Select>
          <div className="col-span-2">
            <div className="flex items-end gap-2">
              <Input
                label={form.document_type === 'cnpj' ? 'CNPJ (busca os dados sozinho)' : 'CPF'}
                value={form.document}
                onChange={e => update('document', form.document_type === 'cnpj' ? fmtCnpj(e.target.value) : e.target.value)}
                onBlur={e => form.document_type === 'cnpj' && lookupCnpj(e.target.value)}
                placeholder={form.document_type === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                className="flex-1"
              />
              {form.document_type === 'cnpj' && (
                <Button type="button" variant="secondary" onClick={() => lookupCnpj(form.document, { force: true })} loading={lookingUp} className="h-10 whitespace-nowrap">
                  <Search className="w-4 h-4" /> Buscar
                </Button>
              )}
            </div>
            {cnpjInfo && (
              <div className={cn('text-[11px] mt-1', cnpjInfo.active ? 'text-emerald-600' : 'text-amber-600')}>
                {cnpjInfo.active ? '✓ Ativa na Receita' : `⚠ Situação: ${cnpjInfo.status}`}
                {cnpjInfo.main_activity ? ` · ${cnpjInfo.main_activity}` : ''}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Telefone" value={form.phone} onChange={e => update('phone', e.target.value)} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} />
        </div>

        <Input label="Endereço" value={form.address} onChange={e => update('address', e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="CEP" value={form.zip_code} onChange={e => update('zip_code', e.target.value)} />
          <Input label="Cidade" value={form.city} onChange={e => update('city', e.target.value)} />
          <Input label="UF" value={form.state} onChange={e => update('state', e.target.value)} maxLength={2} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Select label="Tabela de preço *" value={form.price_table_id} onChange={e => update('price_table_id', e.target.value)}>
            <option value="">Selecione…</option>
            {priceTables.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
          </Select>
          <Input label="Distância (km)" type="number" value={form.distance_km} onChange={e => update('distance_km', e.target.value)} />
          <Input label="Pedido mín. (R$)" type="number" step="0.01" value={form.minimum_order_value} onChange={e => update('minimum_order_value', e.target.value)} hint="Override da tabela" />
        </div>

        <Textarea label="Observações internas" value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} />

        {/* Prazos de pagamento permitidos pra este cliente */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Prazos de pagamento liberados</label>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={allTermsAllowed} onChange={e => setAllTermsAllowed(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-slate-700">Liberar <strong>todos</strong> os prazos cadastrados</span>
          </label>
          {!allTermsAllowed && (
            <div className="space-y-1.5 pl-6 border-l-2 border-slate-300">
              <div className="text-xs text-slate-500 mb-1.5">Marque apenas os prazos que esse cliente pode usar:</div>
              {paymentTerms.length === 0
                ? <div className="text-xs text-slate-500">Nenhum prazo cadastrado em Configurações.</div>
                : paymentTerms.map(pt => (
                    <label key={pt.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={allowedTermIds.includes(pt.id)}
                        onChange={() => toggleTerm(pt.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-slate-700">{pt.label}</span>
                      <span className="text-xs text-slate-400">({pt.days} dias)</span>
                    </label>
                  ))}
              {!allTermsAllowed && allowedTermIds.length === 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
                  Nenhum prazo marcado = cliente pode usar TODOS os prazos ativos. Marque pra restringir.
                </div>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} className="w-4 h-4" />
          <span className="text-sm font-medium text-slate-700">Cliente ativo (pode logar e fazer pedidos)</span>
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{customer ? 'Salvar' : 'Criar cliente'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function CredentialsModal({ credentials, onClose }: { credentials: { email: string; password: string }; onClose: () => void }) {
  function copy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copiado')
  }
  const message = `Olá! Você foi cadastrado como cliente da Ustulimp.\n\n📧 Email: ${credentials.email}\n🔑 Senha: ${credentials.password}\n\nAcesse: ${COMPANY.portalUrl}\n\nRecomendamos trocar sua senha no primeiro acesso.`
  return (
    <Modal open onClose={onClose} title="Credenciais do cliente">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
          ⚠️ Anote ou copie essas credenciais agora — não conseguirá ver a senha novamente.
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
          <div className="flex gap-2">
            <input readOnly value={credentials.email} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-mono" />
            <Button variant="secondary" size="md" onClick={() => copy(credentials.email)}><Copy className="w-4 h-4" /></Button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha temporária</label>
          <div className="flex gap-2">
            <input readOnly value={credentials.password} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-mono font-bold" />
            <Button variant="secondary" size="md" onClick={() => copy(credentials.password)}><Copy className="w-4 h-4" /></Button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mensagem pronta pra enviar no WhatsApp</label>
          <textarea readOnly value={message} rows={6} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-mono" />
          <Button className="mt-2" variant="secondary" onClick={() => copy(message)}><Copy className="w-4 h-4" />Copiar mensagem completa</Button>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Pronto</Button>
        </div>
      </div>
    </Modal>
  )
}
