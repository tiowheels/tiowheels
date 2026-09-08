"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export type PurchaseEventProps = {
  /** Id interno del pedido (clave de deduplicación). */
  orderId: string;
  /** Número visible del pedido (se usa como transaction_id). */
  number: number | string;
  /** Total pagado en CLP. */
  total: number;
  items: { productId?: string | null; name: string; price: number; quantity: number }[];
  /** Renderízalo solo cuando el pedido esté pagado/confirmado; con `false` no dispara nada. */
  enabled?: boolean;
};

const KEY_PREFIX = "tw_purchase_";

/**
 * Dispara Purchase / purchase una sola vez por pedido (marca en localStorage,
 * así no se repite aunque el cliente vuelva a abrir el enlace del pedido otro día).
 * Uso: <PurchaseEvent orderId={order.id} number={order.number} total={order.total} items={order.items} />
 */
export function PurchaseEvent({ orderId, number, total, items, enabled = true }: PurchaseEventProps) {
  useEffect(() => {
    if (!enabled || !orderId) return;
    const key = KEY_PREFIX + orderId;
    try {
      if (localStorage.getItem(key)) return;
    } catch {}
    track("Purchase", {
      orderId: String(number),
      value: total,
      items: items.map((it, i) => ({ id: it.productId ?? `item-${i}`, name: it.name, price: it.price, quantity: it.quantity })),
    });
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {}
    // Solo al montar por pedido: los datos del pedido no cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, enabled]);
  return null;
}
