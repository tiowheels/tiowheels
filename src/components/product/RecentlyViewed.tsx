"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import type { ProductCardProps } from "@/components/product/ProductCard";
import { SpeedometerIcon } from "@/components/ui/AutoIcons";
import { getRecentIds, pushRecentId } from "@/lib/recently-viewed";

type CardProduct = ProductCardProps["product"];

/**
 * "Vistos recientemente": ids en localStorage, datos vía /api/products?ids=...
 * - `currentId`: producto actual (se registra en el historial y se excluye de la lista).
 * No renderiza nada en servidor ni si no hay historial.
 */
export function RecentlyViewed({ currentId, className }: { currentId?: string; className?: string }) {
  const [products, setProducts] = useState<CardProduct[] | null>(null);

  useEffect(() => {
    const ids = currentId ? pushRecentId(currentId) : getRecentIds();
    if (!ids.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización con localStorage
      setProducts([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/products?ids=${encodeURIComponent(ids.join(","))}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d: { products?: CardProduct[] }) => setProducts(Array.isArray(d.products) ? d.products : []))
      .catch(() => setProducts([]));
    return () => ctrl.abort();
  }, [currentId]);

  if (!products?.length) return null;

  return (
    <section className={className} aria-labelledby="recent-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-lime">
            <SpeedometerIcon className="size-6" />
          </span>
          <div>
            <span className="eyebrow">Tu recorrido</span>
            <h2 id="recent-title" className="mt-0.5 text-2xl sm:text-3xl">
              Vistos recientemente
            </h2>
          </div>
        </div>
        <Link href="/tienda" className="btn-ghost btn-sm shrink-0 text-lime-700">
          Ver tienda <ArrowRight className="size-4" />
        </Link>
      </div>
      <ProductGrid products={products} priorityCount={0} />
    </section>
  );
}
