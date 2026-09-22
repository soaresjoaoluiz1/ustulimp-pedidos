import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Tag, Package, Filter, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { Button, Modal } from '@/components/ui'
import CustomerLayout from '@/components/customer/CustomerLayout'
import CartSidebar from '@/components/customer/CartSidebar'
import ProductCard, { ProductCardData } from '@/components/customer/ProductCard'
import { fmtBRL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { boxInfo, baseName, packLabel } from '@/lib/pricing'
import { CategoryIcon } from '@/lib/categoryIcons'

interface Category {
  id: number
  name: string
  slug: string
  icon?: string
  product_count: number
}

interface CatalogProduct extends ProductCardData {
  category_id?: number
  description?: string
  featured: number
}

/** Agrupa produtos pelo nome-base (variantes de embalagem: 1L/5L/20L…), ordenando por tamanho. */
function groupVariants(list: CatalogProduct[]): { base: string; variants: CatalogProduct[] }[] {
  const map = new Map<string, CatalogProduct[]>()
  for (const p of list) {
    const k = baseName(p.name)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(p)
  }
  return Array.from(map.entries()).map(([base, variants]) => ({
    base,
    variants: variants.slice().sort((a, b) => (a.peso_kg || 0) - (b.peso_kg || 0)),
  }))
}

export default function Catalog() {
  const { customer } = useAuth()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [detailVariants, setDetailVariants] = useState<CatalogProduct[] | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  async function loadProducts() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId) params.set('category_id', String(categoryId))
      const data = await api.get<{ products: CatalogProduct[] }>(`/catalog${params.toString() ? '?' + params : ''}`)
      setProducts(data.products)
    } finally { setLoading(false) }
  }

  async function loadCategories() {
    const data = await api.get<{ categories: Category[] }>('/catalog/categories')
    setCategories(data.categories)
  }

  useEffect(() => { loadCategories() }, [])
  useEffect(() => {
    const t = setTimeout(loadProducts, 300)
    return () => clearTimeout(t)
  }, [search, categoryId])

  const grouped = useMemo(() => {
    if (categoryId) return [{ name: '', products }]
    const map = new Map<string, CatalogProduct[]>()
    for (const p of products) {
      const k = p.category_name || 'Outros'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    }
    /* Ordenar pelas categorias */
    const order = categories.map(c => c.name)
    return Array.from(map.entries())
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      .map(([name, products]) => ({ name, products }))
  }, [products, categoryId, categories])

  const featured = useMemo(() => products.filter(p => p.featured === 1).slice(0, 6), [products])

  return (
    <CustomerLayout search={search} onSearchChange={setSearch} onCartClick={() => setCartOpen(true)}>
      {/* Hero / Banner */}
      <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-cyan" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">Bem-vindo</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2">
            {customer?.company_name || customer?.name || 'Olá'} 👋
          </h1>
          <p className="text-white/70 max-w-2xl">
            Monte seu pedido com os produtos desejados. Quando finalizar o envio do pedido, um consultor entra em contato pra confirmar a entrega e pagamento.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 max-w-2xl">
            <Stat icon={<Package className="w-4 h-4" />} label="Produtos" value={String(new Set(products.map(p => baseName(p.name))).size)} />
            <Stat icon={<Tag className="w-4 h-4" />} label="Categorias" value={categories.filter(c => c.product_count > 0).length.toString()} />
            <Stat icon={<Sparkles className="w-4 h-4" />} label="Sua tabela" value={customer?.price_table_name || 'Padrão'} />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Mobile filters button */}
        <div className="lg:hidden mb-4">
          <Button variant="secondary" onClick={() => setMobileFiltersOpen(true)} className="w-full">
            <Filter className="w-4 h-4" /> Filtrar por categoria {categoryId ? '· 1 ativo' : ''}
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar categorias (desktop) */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <div className="sticky top-20">
              <CategoryList categories={categories} selectedId={categoryId} onSelect={setCategoryId} totalProducts={products.length} />
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {/* Featured */}
            {featured.length > 0 && !categoryId && !search && (
              <section className="mb-8">
                <h2 className="font-display text-lg font-bold text-navy-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Destaques
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {groupVariants(featured).map(g => <ProductCard key={g.base} variants={g.variants} onDetails={() => setDetailVariants(g.variants)} />)}
                </div>
              </section>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-card overflow-hidden">
                    <div className="aspect-square skeleton rounded-none" />
                    <div className="p-4 space-y-2">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-3 w-1/2" />
                      <div className="skeleton h-6 w-1/3 mt-3" />
                      <div className="skeleton h-11 w-full mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="font-display text-lg font-bold text-navy-800 mb-1">Nenhum produto encontrado</h3>
                <p className="text-sm text-slate-500">Ajuste a busca ou os filtros.</p>
                {(search || categoryId) && (
                  <Button variant="secondary" className="mt-4" onClick={() => { setSearch(''); setCategoryId(null) }}>Limpar filtros</Button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {grouped.map(group => {
                  const vgroups = groupVariants(group.products)
                  return (
                  <section key={group.name}>
                    {group.name && (
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="font-display text-lg font-bold text-navy-800">{group.name}</h2>
                        <span className="text-xs text-slate-400 font-semibold">{vgroups.length} {vgroups.length === 1 ? 'produto' : 'produtos'}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {vgroups.map(g => <ProductCard key={g.base} variants={g.variants} onDetails={() => setDetailVariants(g.variants)} />)}
                    </div>
                  </section>
                )})}
              </div>
            )}
          </div>
        </div>
      </div>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <Modal open onClose={() => setMobileFiltersOpen(false)} title="Categorias">
          <CategoryList
            categories={categories}
            selectedId={categoryId}
            onSelect={(id) => { setCategoryId(id); setMobileFiltersOpen(false) }}
            totalProducts={products.length}
          />
        </Modal>
      )}

      {/* Detail modal */}
      {detailVariants && (
        <Modal open onClose={() => setDetailVariants(null)} title={baseName(detailVariants[0].name)} size="lg">
          <ProductDetailContent variants={detailVariants} />
        </Modal>
      )}
    </CustomerLayout>
  )
}

function CategoryList({ categories, selectedId, onSelect, totalProducts }: {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  totalProducts: number
}) {
  const active = categories.filter(c => c.product_count > 0)
  return (
    <div className="bg-white rounded-xl shadow-card p-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-2">Categorias</div>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition',
          selectedId === null ? 'bg-navy-800 text-white' : 'text-slate-700 hover:bg-slate-50'
        )}
      >
        <span>Todos os produtos</span>
        <span className={cn('text-xs', selectedId === null ? 'text-white/70' : 'text-slate-400')}>{totalProducts}</span>
      </button>
      <div className="mt-1 space-y-0.5">
        {active.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition',
              selectedId === c.id ? 'bg-navy-100 text-navy-800' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <CategoryIcon slug={c.slug} className={cn('w-4 h-4 flex-shrink-0', selectedId === c.id ? 'text-navy-700' : 'text-slate-500')} />
              <span className="truncate">{c.name}</span>
            </span>
            <span className={cn('text-xs flex-shrink-0', selectedId === c.id ? 'text-navy-700 font-bold' : 'text-slate-400')}>{c.product_count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-white/60 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
        {icon} {label}
      </div>
      <div className="font-display text-lg sm:text-xl font-extrabold">{value}</div>
    </div>
  )
}

function ProductDetailContent({ variants }: { variants: CatalogProduct[] }) {
  const { addItem, getQty } = useCart()
  // abre na primeira embalagem que tem foto (ex: só o 5L tem foto → card abre no 5L)
  const [selIdx, setSelIdx] = useState(() => Math.max(0, variants.findIndex(v => v.image_url)))
  const product = variants[selIdx] || variants[0]
  const nome = baseName(product.name)
  const inCart = getQty(product.id)

  return (
    <div className="space-y-4">
      <div className={cn(
        'aspect-video rounded-xl flex items-center justify-center border border-slate-100',
        product.image_url ? 'bg-white' : 'bg-gradient-to-br from-blue-50 to-cyan-50'
      )}>
        {product.image_url ? (
          <img src={product.image_url} className="max-h-full max-w-full p-6 object-contain" />
        ) : (
          <div className="w-32 h-44 bg-gradient-to-br from-navy-700 to-brand-blue rounded-xl flex items-center justify-center text-white shadow-lg">
            <span className="font-display font-extrabold">{product.sku?.replace(/[a-z]/g, '')}</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs text-slate-400 mb-1">SKU {product.sku} · {product.category_name}</div>
        <h2 className="font-display text-xl font-extrabold text-navy-800 mb-1">{nome}</h2>
        {product.short_use && <p className="text-sm text-slate-600">{product.short_use}</p>}
      </div>

      {variants.length > 1 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1.5">Escolha a embalagem</div>
          <div className="flex flex-wrap gap-2">
            {variants.map((v, i) => (
              <button key={v.id} type="button" onClick={() => setSelIdx(i)}
                className={cn('px-3.5 py-1.5 rounded-lg text-sm font-bold border transition', i === selIdx ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-slate-600 border-slate-200 hover:border-navy-400')}>
                {packLabel(v.name)}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.tags.map(t => <span key={t} className="px-2.5 py-0.5 rounded-full bg-blue-50 text-brand-blue text-xs font-semibold">{t}</span>)}
        </div>
      )}

      {product.description && (
        <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description }} />
      )}

      {(() => {
        const box = boxInfo(product.price, product.units_per_box)
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-blue-50 rounded-xl p-4">
            <div>
              <div className="text-xs text-slate-500">{box.label ? `Caixa (${box.units} un.)` : 'Preço'}</div>
              <div className="font-display text-2xl font-extrabold text-emerald-600 tabular-nums">{fmtBRL(product.price)}</div>
            </div>
            {box.perUnit != null && (
              <div>
                <div className="text-xs text-slate-500">Preço / unidade</div>
                <div className="font-display text-lg font-bold text-navy-700 tabular-nums">{fmtBRL(box.perUnit)}</div>
              </div>
            )}
            {product.suggested_sale_price && (
              <div>
                <div className="text-xs text-slate-500">Revenda sugerida</div>
                <div className="font-display text-lg font-bold text-navy-700 tabular-nums">{fmtBRL(product.suggested_sale_price)}</div>
              </div>
            )}
          </div>
        )
      })()}

      <Button
        size="lg"
        className="w-full"
        onClick={() => addItem({
          product_id: product.id, sku: product.sku, name: product.name, unit: product.unit,
          price: product.price, peso_kg: product.peso_kg, volume_m3: product.volume_m3,
          image_url: product.image_url, category_name: product.category_name
        })}
      >
        {inCart > 0 ? `Adicionar mais 1 caixa (já tem ${inCart})` : 'Adicionar 1 caixa ao carrinho'}
      </Button>
    </div>
  )
}
