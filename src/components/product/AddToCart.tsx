"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Check, ArrowRight } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Price } from "@/components/ui/Price";
import { cn, formatCLP } from "@/lib/format";

export type AddToCartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  image: string | null;
};

export function AddToCart({ product, relatedAnchor }: { product: AddToCartProduct; relatedAnchor?: string }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  const soldOut = product.stock <= 0;
  const inCart = cart.hydrated ? (cart.items.find((i) => i.productId === product.id)?.qty ?? 0) : 0;
  const remaining = Math.max(0, product.stock - inCart);
  const maxed = !soldOut && remaining === 0;
  const canAdd = !soldOut && !maxed;

  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, Math.max(1, remaining))));
  }, [remaining]);

  // Barra inferior móvil: aparece cuando el botón principal sale de pantalla.
  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function add() {
    if (!canAdd) return;
    cart.add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, stock: product.stock }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  const button = (size: "lg" | "md") => (
    <button
      type="button"
      onClick={add}
      disabled={!canAdd}
      className={cn("btn-lime w-full", size === "lg" ? "btn-lg" : "btn-md", added && "!bg-ink !text-white")}
      aria-live="polite"
    >
      {soldOut ? (
        "Agotado"
      ) : maxed ? (
        "Máximo en el carrito"
      ) : added ? (
        <>
          <Check className="size-5" aria-hidden /> Agregado
        </>
      ) : (
        <>
          <ShoppingBag className="size-5" aria-hidden /> Agregar al carrito{qty > 1 ? ` · ${formatCLP(qty * product.price)}` : ""}
        </>
      )}
    </button>
  );

  return (
    <>
      <div ref={anchor} className="flex flex-col gap-3">
        {!soldOut ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink-700">Cantidad</span>
            <QuantityStepper value={qty} min={1} max={Math.max(1, remaining)} onChange={setQty} />
            {remaining > 0 && remaining <= 5 ? (
              <span className="text-xs font-semibold text-flame">{remaining === 1 ? "Última unidad" : `Quedan ${remaining}`}</span>
            ) : remaining > 5 ? (
              <span className="text-xs font-semibold text-success">Disponible</span>
            ) : null}
          </div>
        ) : null}
        {!soldOut && qty > 1 ? (
          <div className="flex items-baseline justify-between rounded-xl bg-ink-50 px-4 py-2.5 text-sm" aria-live="polite">
            <span className="text-ink-500">
              {qty} × {formatCLP(product.price)}
            </span>
            <span className="text-base font-bold tabular-nums">Total {formatCLP(qty * product.price)}</span>
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          {button("lg")}
          {inCart > 0 ? (
            <Link href="/carrito" className="btn-outline btn-lg sm:shrink-0">
              Ver carrito ({inCart}) <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
        {soldOut && relatedAnchor ? (
          <a href={`#${relatedAnchor}`} className="text-sm font-semibold text-lime-700 underline-offset-4 hover:underline">
            Este modelo se agotó, pero mira estos parecidos ↓
          </a>
        ) : null}
      </div>

      {/* Barra inferior sticky (solo móvil) */}
      <div
        className={cn(
          "safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur-md transition-transform duration-300 md:hidden",
          showBar ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showBar}
      >
        <div className="flex items-center gap-3 px-4 py-3 pr-[84px]">
          <div className="min-w-0">
            <div className="truncate text-xs text-ink-500">{product.name}</div>
            {qty > 1 ? (
              <div className="text-base font-bold tabular-nums">{formatCLP(qty * product.price)} <span className="text-xs font-medium text-ink-500">({qty} u.)</span></div>
            ) : (
              <Price amount={product.price} compareAt={product.compareAtPrice} size="md" />
            )}
          </div>
          <div className="ml-auto w-44 shrink-0">{button("md")}</div>
        </div>
      </div>
    </>
  );
}
