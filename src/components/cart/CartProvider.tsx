"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null; // path base de ProductImage
  qty: number;
  stock: number;
};

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  hydrated: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartState | null>(null);
/** Clave de localStorage del carrito (la lee también la analítica). */
export const CART_STORAGE_KEY = "tw_cart_v1";
const KEY = CART_STORAGE_KEY;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización con estado externo (hidratación/DOM)
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add = useCallback<CartState["add"]>((item, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.productId === item.productId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], ...item, qty: Math.min(item.stock, next[i].qty + qty) };
        return next;
      }
      return [...prev, { ...item, qty: Math.min(item.stock, qty) }];
    });
    setOpen(true);
    track("AddToCart", { items: [{ id: item.productId, name: item.name, price: item.price, quantity: Math.max(1, Math.min(item.stock, qty)) }] });
  }, []);

  const setQty = useCallback<CartState["setQty"]>((productId, qty) => {
    setItems((prev) => prev.map((p) => (p.productId === productId ? { ...p, qty: Math.max(1, Math.min(p.stock, qty)) } : p)));
  }, []);

  const remove = useCallback<CartState["remove"]>((productId) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
      isOpen,
      hydrated,
      add,
      setQty,
      remove,
      clear,
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [items, isOpen, hydrated, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
