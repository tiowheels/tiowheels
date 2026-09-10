"use client";

import Link from "next/link";
import type { CartItem } from "@/components/cart/CartProvider";
import { mediaUrl } from "@/lib/media-url";
import { formatCLP, pluralize } from "@/lib/format";

export function OrderSummary({ items, subtotal, shippingMethod, compact = false }: { items: CartItem[]; subtotal: number; shippingMethod: "DELIVERY_COD" | "PICKUP"; compact?: boolean }) {
  const count = items.reduce((s, i) => s + i.qty, 0);
  return (
    <div>
      {!compact ? (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg">Tu pedido</h2>
          <span className="text-sm text-ink-500">
            {count} {pluralize(count, "artículo", "artículos")}
          </span>
        </div>
      ) : null}
      <ul className="max-h-[40vh] divide-y divide-ink-100 overflow-y-auto pr-1 lg:max-h-[46vh]">
        {items.map((it) => (
          <li key={it.productId} className="flex items-center gap-3 py-3">
            <div className="relative shrink-0">
              <img src={mediaUrl(it.image, "thumb")} alt="" className="size-14 rounded-xl bg-ink-50 object-contain" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-white">{it.qty}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[13px] font-semibold leading-snug">{it.name}</div>
              <div className="text-xs text-ink-500">{formatCLP(it.price)} c/u</div>
            </div>
            <div className="shrink-0 text-sm font-bold tabular-nums">{formatCLP(it.price * it.qty)}</div>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-t border-ink-100 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-500">Subtotal</dt>
          <dd className="font-semibold tabular-nums">{formatCLP(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">Envío</dt>
          <dd className="text-right font-semibold">{shippingMethod === "PICKUP" ? <span className="text-lime-700">Gratis (retiro)</span> : "Por pagar al recibir"}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
          <dt className="text-base font-bold">Total a pagar</dt>
          <dd className="text-2xl font-extrabold tabular-nums">{formatCLP(subtotal)}</dd>
        </div>
      </dl>
      {shippingMethod === "DELIVERY_COD" ? <p className="mt-2 text-xs text-ink-400">El costo del envío lo cobra el courier al momento de la entrega y no está incluido en este total.</p> : null}
      <Link href="/carrito" className="btn-ghost btn-sm mt-3 w-full">
        Editar carrito
      </Link>
    </div>
  );
}
