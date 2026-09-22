import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react'

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
}

type CartState = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  updateQty: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clear: () => void
  subtotal: number
  totalItems: number
  totalQty: number
  totalPeso: number
  totalVolume: number
  getQty: (productId: number) => number
}

const STORAGE_KEY = 'oxi_pedidos_cart_v1'
const CartContext = createContext<CartState | null>(null)

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data
    return []
  } catch { return [] }
}

function saveCart(items: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart())

  useEffect(() => { saveCart(items) }, [items])

  function addItem(item: Omit<CartItem, 'quantity'>, qty = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id)
      if (existing) {
        return prev.map(i => i.product_id === item.product_id
          ? { ...i, quantity: i.quantity + qty }
          : i)
      }
      return [...prev, { ...item, quantity: qty }]
    })
  }

  function updateQty(productId: number, quantity: number) {
    setItems(prev => {
      if (quantity <= 0) return prev.filter(i => i.product_id !== productId)
      return prev.map(i => i.product_id === productId ? { ...i, quantity } : i)
    })
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
      addItem, updateQty, removeItem, clear, getQty,
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
