"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import { cn, formatCLP } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { CarIcon, WheelIcon, CheckeredFlagIcon } from "@/components/ui/AutoIcons";
import { useCart } from "@/components/cart/CartProvider";
import { collectionOf } from "@/lib/collections";

export type ProductCardProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    compareAtPrice?: number | null;
    stock: number;
    brand?: string | null;
    createdAt?: Date | string;
    images: { path: string; alt?: string | null }[];
    categories?: { slug: string; name: string; parentId: string | null }[];
  };
  priority?: boolean;
  className?: string;
};

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 21;
const LOADED_AT = Date.now();

export function ProductCard({ product, priority, className }: ProductCardProps) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const img = product.images[0];
  const hover = product.images[1];
  const soldOut = product.stock <= 0;
  const inCart = cart.hydrated ? (cart.items.find((i) => i.productId === product.id)?.qty ?? 0) : 0;
  const remaining = Math.max(0, product.stock - inCart);
  const canAdd = !soldOut && remaining > 0;
  const isNew = product.createdAt ? LOADED_AT - new Date(product.createdAt).getTime() < NEW_WINDOW_MS : false;
  const discount = product.compareAtPrice && product.compareAtPrice > product.price ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const collection = collectionOf(product.categories);
  const stockLevel = soldOut ? 0 : product.stock === 1 ? 1 : product.stock <= 3 ? 2 : 3;

  function add(e: React.MouseEvent) {
    e.preventDefault();
    if (!canAdd) return;
    cart.add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: img?.path ?? null, stock: product.stock });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <Link
      href={`/producto/${product.slug}`}
      aria-label={`${product.name}, ${formatCLP(product.price)}`}
      className={cn(
        "group card relative flex flex-col overflow-hidden ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop hover:ring-ink-100",
        className,
      )}
    >
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        <img
          src={mediaUrl(img?.path, "thumb")}
          alt={img?.alt ?? product.name}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn("size-full object-cover transition duration-700 ease-out group-hover:scale-[1.05]", hover && "group-hover:opacity-0", soldOut && "opacity-60 grayscale-[35%]")}
        />
        {hover ? <img src={mediaUrl(hover.path, "thumb")} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.05] group-hover:opacity-100" /> : null}

        {/* Franja a cuadros al hover */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 translate-y-full bg-[repeating-linear-gradient(90deg,#0a0a0a_0_8px,#fff_8px_16px)] opacity-90 transition-transform duration-300 group-hover:translate-y-0" />

        {/* Etiquetas */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut ? <Badge tone="dark">Agotado</Badge> : product.stock === 1 ? <Badge tone="warn">Última unidad</Badge> : isNew ? <Badge tone="lime">Nuevo</Badge> : null}
          {discount > 0 ? <Badge tone="danger" className="bg-danger text-white">-{discount}%</Badge> : null}
        </div>
        <span className="absolute right-3 top-3 inline-flex h-6 items-center gap-1 rounded-full bg-white/90 px-2 text-[10px] font-bold tracking-wider text-ink-700 shadow-sm backdrop-blur">
          <WheelIcon className="size-3" /> 1:64
        </span>
        {collection ? (
          <span className="absolute bottom-3 left-3 inline-flex h-6 max-w-[80%] items-center gap-1 truncate rounded-full bg-ink/85 px-2.5 text-[10px] font-bold uppercase tracking-wider text-lime shadow-sm backdrop-blur">
            <CheckeredFlagIcon className="size-3 shrink-0" /> <span className="truncate">{collection.name}</span>
          </span>
        ) : null}
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
          <CarIcon className="size-3.5 shrink-0" />
          <span className="truncate">{product.brand ?? "Hot Wheels"}</span>
        </span>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink decoration-lime decoration-2 underline-offset-4 group-hover:underline">{product.name}</h3>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tabular-nums leading-none">{formatCLP(product.price)}</span>
              {discount > 0 ? <s className="text-xs font-medium text-ink-400">{formatCLP(product.compareAtPrice!)}</s> : null}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5" aria-label={soldOut ? "Sin stock" : `${product.stock} disponibles`}>
              <span className="flex gap-0.5">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={cn("h-1.5 w-3 rounded-full", n <= stockLevel ? (stockLevel === 1 ? "bg-flame" : "bg-lime") : "bg-ink-100")} />
                ))}
              </span>
              <span className={cn("text-[11px] font-semibold", soldOut ? "text-ink-400" : stockLevel === 1 ? "text-flame" : "text-ink-500")}>
                {soldOut ? "Agotado" : inCart > 0 ? `${inCart} en carrito` : product.stock <= 5 ? `Quedan ${product.stock}` : "En stock"}
              </span>
            </div>
          </div>

          {!soldOut ? (
            <button
              type="button"
              onClick={add}
              disabled={!canAdd}
              aria-label={`Agregar ${product.name} al carrito`}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-card transition-all duration-200 hover:bg-lime hover:text-ink active:scale-95 disabled:bg-ink-200 disabled:text-ink-400",
                added && "bg-lime text-ink",
              )}
            >
              {added ? <Check className="size-5" /> : <Plus className="size-5" />}
            </button>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
