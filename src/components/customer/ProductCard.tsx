import { useState } from 'react'
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { fmtBRL } from '@/lib/format'
import { cn } from '@/lib/cn'
import { boxInfo, baseName, packLabel } from '@/lib/pricing'

export interface ProductCardData {
  id: number
  sku?: string
  name: string
  short_use?: string
  description?: string
  unit?: string
  image_url?: string
  market_price?: number
  suggested_sale_price?: number
  units_per_box?: number
  peso_kg?: number
  volume_m3?: number
  tags?: string[]
  price: number
  category_name?: string
}

/** Card de produto com seletor de embalagem (variantes: 1L / 5L / 20L…). */
export default function ProductCard({ variants, onDetails }: { variants: ProductCardData[]; onDetails?: () => void }) {
  const { getQty, addItem, updateQty } = useCart()
  // abre na primeira embalagem que tem foto (ex: só o 5L tem foto → card abre no 5L)
  const [selIdx, setSelIdx] = useState(() => Math.max(0, variants.findIndex(v => v.image_url)))
  const [localQty, setLocalQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  const product = variants[selIdx] || variants[0]
  const nome = baseName(product.name)
  const inCart = getQty(product.id)
  const box = boxInfo(product.price, product.units_per_box)

  function handleAdd() {
    addItem({
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      price: product.price,
      peso_kg: product.peso_kg,
      volume_m3: product.volume_m3,
      image_url: product.image_url,
      category_name: product.category_name,
    }, localQty)
    setJustAdded(true)
    setLocalQty(1)
    setTimeout(() => setJustAdded(false), 1400)
  }

  return (
    <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden flex flex-col group">
      {/* Imagem */}
      <button
        onClick={onDetails}
        aria-label={`Ver detalhes de ${nome}`}
        className={cn(
          'relative aspect-square flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 border-b border-slate-100',
          product.image_url ? 'bg-white' : 'bg-gradient-to-br from-blue-50 to-red-50'
        )}
      >
        {product.image_url ? (
          <img src={product.image_url} alt={nome} loading="lazy" className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-20 h-28 bg-gradient-to-br from-navy-800 to-navy-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <span className="font-display font-extrabold text-xs px-1 text-center">{nome}</span>
          </div>
        )}
        {inCart > 0 && (
          <div className="absolute top-2 right-2 bg-brand-cyan text-white text-xs font-extrabold min-w-[24px] h-6 px-1.5 rounded-full shadow flex items-center justify-center" aria-label={`${inCart} no carrinho`}>
            {inCart}
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 min-h-0 mb-2.5">
          <button onClick={onDetails} className="text-left w-full focus:outline-none">
            <div className="font-semibold text-sm text-navy-800 line-clamp-2 leading-snug mb-0.5">{nome}</div>
            <div className="text-[11px] text-slate-400 mb-1">SKU {product.sku || '—'}</div>
            {product.short_use && (
              <div className="text-xs text-slate-500 line-clamp-1">{product.short_use}</div>
            )}
          </button>
        </div>

        {/* Seletor de embalagem */}
        {variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => { setSelIdx(i); setLocalQty(1) }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold border transition',
                  i === selIdx
                    ? 'bg-navy-800 text-white border-navy-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-navy-400'
                )}
              >
                {packLabel(v.name)}
              </button>
            ))}
          </div>
        )}

        {/* Preço da caixa · preço por unidade */}
        <div className="mb-3 space-y-1">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{box.label ? `Caixa · ${box.units} un.` : 'Preço'}</div>
            <div className="font-display font-extrabold text-xl text-emerald-600 leading-none tabular-nums">
              {fmtBRL(product.price)}
              {box.label && <span className="text-[11px] font-semibold text-slate-400 ml-1">/cx</span>}
            </div>
          </div>
          {box.perUnit != null && (
            <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
              Unidade <b className="text-navy-700 tabular-nums">{fmtBRL(box.perUnit)}</b>
            </div>
          )}
          {product.suggested_sale_price ? (
            <div className="text-[11px] text-slate-500">Revende <b className="text-navy-700 tabular-nums">{fmtBRL(product.suggested_sale_price)}</b></div>
          ) : null}
        </div>

        {/* Stepper + adicionar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden h-11 w-full">
            <button type="button" onClick={() => setLocalQty(q => Math.max(q - 1, 1))} disabled={localQty <= 1} aria-label="Diminuir" className="w-10 h-11 flex items-center justify-center text-slate-700 hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition">
              <Minus className="w-4 h-4" aria-hidden />
            </button>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" value={localQty}
              onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); if (Number.isFinite(n) && n > 0) setLocalQty(Math.min(n, 999)); else if (e.target.value === '') setLocalQty(1) }}
              aria-label="Quantidade"
              className="flex-1 h-full text-center text-sm font-bold text-navy-800 bg-transparent outline-none tabular-nums focus:bg-white min-w-0"
            />
            <button type="button" onClick={() => setLocalQty(q => Math.min(q + 1, 999))} aria-label="Aumentar" className="w-10 h-11 flex items-center justify-center text-slate-700 hover:bg-slate-200 active:scale-95 transition">
              <Plus className="w-4 h-4" aria-hidden />
            </button>
          </div>

          <button
            type="button" onClick={handleAdd}
            aria-label={`Adicionar ${localQty} ${localQty === 1 ? 'caixa' : 'caixas'} de ${nome} ${packLabel(product.name)} ao carrinho`}
            className={cn(
              'flex-1 h-11 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              justAdded ? 'bg-emerald-500 text-white focus-visible:ring-emerald-500' : 'bg-navy-800 text-white hover:bg-navy-700 focus-visible:ring-navy-500'
            )}
          >
            {justAdded ? (<><Check className="w-4 h-4" aria-hidden /> Adicionado</>) : (<><ShoppingCart className="w-4 h-4" aria-hidden /> Adicionar</>)}
          </button>
        </div>

        {inCart > 0 && (
          <button type="button" onClick={() => updateQty(product.id, 0)} className="mt-2 text-[11px] text-slate-500 hover:text-red-500 underline transition focus:outline-none">
            Remover do carrinho ({inCart})
          </button>
        )}
      </div>
    </div>
  )
}
