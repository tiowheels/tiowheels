"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "./CartProvider";
import { mediaUrl } from "@/lib/media-url";
import { formatCLP, cn, pluralize } from "@/lib/format";
import { QuantityStepper } from "@/components/ui/QuantityStepper";

export function CartDrawer() {
  const cart = useCart();

  useEffect(() => {
    if (!cart.isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cart.isOpen, cart]);

  return (
    <>
      <div onClick={cart.close} className={cn("fixed inset-0 z-[60] bg-ink/50 backdrop-blur-[2px] transition-opacity", cart.isOpen ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label="Carrito" className={cn("fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-pop transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]", cart.isOpen ? "translate-x-0" : "translate-x-full")}>
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-lg">
            Tu carrito <span className="text-ink-400 font-medium text-sm">· {cart.count} {pluralize(cart.count, "artículo", "artículos")}</span>
          </h2>
          <button onClick={cart.close} aria-label="Cerrar" className="flex size-10 items-center justify-center rounded-full hover:bg-ink-50">
            <X className="size-5" />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-ink-50">
              <ShoppingBag className="size-7 text-ink-400" />
            </div>
            <p className="font-semibold">Tu carrito está vacío</p>
            <p className="text-sm text-ink-500">Explora la tienda y encuentra tu próximo favorito.</p>
            <Link href="/tienda" onClick={cart.close} className="btn-primary btn-md mt-2">
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto px-5">
              {cart.items.map((it) => (
                <li key={it.productId} className="flex gap-4 py-4">
                  <Link href={`/producto/${it.slug}`} onClick={cart.close} className="shrink-0">
                    <img src={mediaUrl(it.image, "thumb")} alt="" className="size-20 rounded-xl bg-ink-50 object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/producto/${it.slug}`} onClick={cart.close} className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">
                      {it.name}
                    </Link>
                    <div className="mt-1 text-sm font-bold">{formatCLP(it.price)}</div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QuantityStepper size="sm" value={it.qty} max={it.stock} onChange={(v) => cart.setQty(it.productId, v)} />
                      <button onClick={() => cart.remove(it.productId)} aria-label="Quitar" className="flex size-9 items-center justify-center rounded-full text-ink-400 hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {it.qty >= it.stock ? <div className="mt-1 text-[11px] font-semibold text-flame">Máximo disponible</div> : null}
                  </div>
                </li>
              ))}
            </ul>
            <footer className="safe-bottom border-t border-ink-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="text-lg font-bold tabular-nums">{formatCLP(cart.subtotal)}</span>
              </div>
              <p className="mb-3 text-xs text-ink-400">Envío por pagar al recibir o retiro gratis. Lo eliges en el siguiente paso.</p>
              <Link href="/checkout" onClick={cart.close} className="btn-lime btn-lg w-full">
                Finalizar compra <ArrowRight className="size-5" />
              </Link>
              <Link href="/carrito" onClick={cart.close} className="btn-ghost btn-md mt-1 w-full">
                Ver carrito completo
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
