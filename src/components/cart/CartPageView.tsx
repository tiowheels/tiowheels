"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft, ShoppingBag, Trash2, Truck, Store, ShieldCheck } from "lucide-react";
import { useCart } from "./CartProvider";
import { mediaUrl } from "@/lib/media-url";
import { formatCLP, pluralize } from "@/lib/format";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";

export function CartPageView() {
  const cart = useCart();

  if (!cart.hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card flex gap-4 p-4">
              <div className="size-24 animate-pulse rounded-xl bg-ink-50" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-lime-50 text-lime-700">
          <ShoppingBag className="size-9" aria-hidden />
        </div>
        <h2 className="mt-5 text-2xl">Tu carrito está vacío</h2>
        <p className="mt-2 max-w-sm text-ink-500">Todavía no agregas ningún auto. Explora la tienda y encuentra tu próximo favorito.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/tienda" className="btn-primary btn-md">
            Ir a la tienda <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/tienda?orden=nuevo" className="btn-outline btn-md">
            Ver recién llegados
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <section aria-label="Productos en el carrito">
        <ul className="space-y-3">
          {cart.items.map((it) => (
            <li key={it.productId} className="card flex gap-4 p-3 sm:p-4">
              <Link href={`/producto/${it.slug}`} className="shrink-0" aria-label={it.name}>
                <img src={mediaUrl(it.image, "thumb")} alt="" className="size-24 rounded-xl bg-ink-50 object-cover sm:size-28" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/producto/${it.slug}`} className="line-clamp-2 font-semibold leading-snug hover:underline">
                    {it.name}
                  </Link>
                  <button type="button" onClick={() => cart.remove(it.productId)} aria-label={`Quitar ${it.name} del carrito`} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-1 text-sm text-ink-500">{formatCLP(it.price)} c/u</div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <QuantityStepper size="sm" value={it.qty} max={it.stock} onChange={(v) => cart.setQty(it.productId, v)} />
                    {it.qty >= it.stock ? <span className="text-[11px] font-semibold text-flame">Máximo disponible</span> : null}
                  </div>
                  <div className="text-base font-bold tabular-nums">{formatCLP(it.price * it.qty)}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/tienda" className="btn-ghost btn-sm">
            <ArrowLeft className="size-4" aria-hidden /> Seguir comprando
          </Link>
          <button type="button" onClick={cart.clear} className="text-[13px] font-semibold text-ink-400 hover:text-danger">
            Vaciar carrito
          </button>
        </div>
      </section>

      <aside className="card p-5 sm:p-6 lg:sticky lg:top-[100px]" aria-label="Resumen">
        <h2 className="text-lg">Resumen</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">
              {cart.count} {pluralize(cart.count, "artículo", "artículos")}
            </dt>
            <dd className="font-semibold tabular-nums">{formatCLP(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Envío</dt>
            <dd className="text-right text-xs font-semibold text-ink-700">Por pagar al courier</dd>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
            <dt className="font-bold">Total</dt>
            <dd className="text-xl font-bold tabular-nums">{formatCLP(cart.subtotal)}</dd>
          </div>
        </dl>
        <Link href="/checkout" className="btn-lime btn-lg mt-5 w-full">
          Finalizar compra <ArrowRight className="size-5" aria-hidden />
        </Link>
        <p className="mt-3 text-center text-xs text-ink-400">Precios y stock se confirman al pagar.</p>

        <ul className="mt-5 space-y-2.5 border-t border-ink-100 pt-4 text-[13px] text-ink-700">
          <li className="flex gap-2.5">
            <Truck className="mt-0.5 size-4 shrink-0 text-lime-700" aria-hidden />
            <span>
              <b>El costo de envío se paga al courier al recibir</b> (Starken u otros). Despachamos a todo Chile.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Store className="mt-0.5 size-4 shrink-0 text-lime-700" aria-hidden />
            <span>
              <b>Retiro gratis</b>, coordinado por WhatsApp.
            </span>
          </li>
          <li className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-lime-700" aria-hidden />
            <span>Pago seguro con Flow (Webpay, tarjetas) o transferencia.</span>
          </li>
        </ul>
        <a href={whatsappLink("Hola Tío Wheels, tengo una duda con mi carrito")} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-500 hover:text-ink">
          <WhatsAppIcon className="size-4 text-[#25D366]" /> ¿Dudas? Escríbenos
        </a>
      </aside>
    </div>
  );
}
