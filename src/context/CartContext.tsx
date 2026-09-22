import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'

export type CartItem = {
  product_id: number
  sku?: string
  name: string
  unit?: string
  price: number
  quantity: number
  peso_kg?: number
  volume_m3?: number
  image_url?: string
  category_name?: string
  units_per_box?: number
}

type CartState = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  updateQty: (productId: number, quantity: number) => void
  updatePrice: (productId: number, price: number) => void
  removeItem: (productId: number) => void
  clear: () => void
  removeMany: (productIds: number[]) => void
  subtotal: number
  totalItems: number
  totalQty: number
  totalPeso: number
  totalVolume: number
  getQty: (productId: number) => number
}

const CartContext = createContext<CartState | null>(null)

/* Carrinho é POR USUÁRIO: num PC compartilhado (balcão da loja), o próximo a logar
   não pode herdar o carrinho — e os preços — de quem usou antes. */
function storageKey(userId?: number | null) {
  return userId ? `ustulimp_pedidos_cart_u${userId}` : 'ustulimp_pedidos_cart_anon'
}

function loadCart(userId?: number | null): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    /* Higieniza o que veio do storage (quantidade tem que ser caixa inteira) */
    return data.filter(i => i && Number.isFinite(i.price)).map(i => ({ ...i, quantity: sanitizeQty(i.quantity) }))
      .filter(i => i.quantity > 0)
  } catch { return [] }
}

function saveCart(userId: number | null | undefined, items: CartItem[]) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(items)) } catch {}
}

/** Quantidade sempre em CAIXAS inteiras, de 1 a 999 (texto colado/NaN vira 0 = remove). */
export function sanitizeQty(q: unknown): number {
  const n = Math.floor(Number(q))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(n, 999)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [items, setItems] = useState<CartItem[]>(() => loadCart(null))

  /* Trocou de usuário (login/logout): carrega o carrinho daquele usuário */
  useEffect(() => { setItems(loadCart(userId)) }, [userId])

  useEffect(() => { saveCart(userId, items) }, [items, userId])

  function addItem(item: Omit<CartItem, 'quantity'>, qty = 1) {
    const add = sanitizeQty(qty) || 1
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id)
      if (existing) {
        return prev.map(i => i.product_id === item.product_id
          ? { ...i, ...item, quantity: sanitizeQty(i.quantity + add) }
          : i)
      }
      return [...prev, { ...item, quantity: add }]
    })
  }

  function updateQty(productId: number, quantity: number) {
    const qty = sanitizeQty(quantity)
    setItems(prev => {
      if (qty <= 0) return prev.filter(i => i.product_id !== productId)
      return prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i)
    })
  }

  /** Atualiza o preço de um item (o catálogo manda, não o que ficou salvo no navegador). */
  function updatePrice(productId: number, price: number) {
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, price } : i))
  }

  /** Tira do carrinho produtos que o servidor recusou (saíram do catálogo/da tabela). */
  function removeMany(productIds: number[]) {
    setItems(prev => prev.filter(i => !productIds.includes(i.product_id)))
  }

  function removeItem(productId: number) {
    setItems(prev => prev.filter(i => i.product_id !== productId))
  }

  function clear() {
    setItems([])
  }

  function getQty(productId: number) {
    return items.find(i => i.product_id === productId)?.quantity || 0
  }

  const totals = useMemo(() => {
    let subtotal = 0, qty = 0, peso = 0, vol = 0
    for (const i of items) {
      subtotal += i.price * i.quantity
      qty += i.quantity
      peso += (i.peso_kg || 0) * i.quantity
      vol += (i.volume_m3 || 0) * i.quantity
    }
    return {
      subtotal: +subtotal.toFixed(2),
      totalQty: qty,
      totalPeso: +peso.toFixed(3),
      totalVolume: +vol.toFixed(4)
    }
  }, [items])

  return (
    <CartContext.Provider value={{
      items,
      addItem, updateQty, updatePrice, removeItem, removeMany, clear, getQty,
      subtotal: totals.subtotal,
      totalItems: items.length,
      totalQty: totals.totalQty,
      totalPeso: totals.totalPeso,
      totalVolume: totals.totalVolume
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart fora do CartProvider')
  return ctx
}
