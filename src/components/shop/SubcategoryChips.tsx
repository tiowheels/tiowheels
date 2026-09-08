import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { buildShopUrl, type ShopQuery } from "@/lib/shop-url";
import { cn } from "@/lib/format";
import type { ShopCategoryNode } from "./types";

/**
 * Chips horizontales para navegar entre subcategorías.
 * Si la categoría actual es raíz, muestra sus hijas; si es hija, muestra el padre y sus hermanas.
 */
export function SubcategoryChips({ filters, current, parent }: { filters: ShopQuery; current: ShopCategoryNode; parent?: ShopCategoryNode | null }) {
  const siblings = parent ? parent.children : current.children;
  const visible = siblings.filter((c) => c.count > 0 || c.slug === filters.cat);
  if (!visible.length) return null;

  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0" role="navigation" aria-label="Subcategorías">
      {parent ? (
        <Link href={buildShopUrl(filters, { cat: parent.slug })} className="chip shrink-0 snap-start">
          <ChevronLeft className="size-3.5" aria-hidden /> {parent.name}
        </Link>
      ) : (
        <span className="chip chip-active shrink-0 snap-start" aria-current="true">
          Todo {current.name}
        </span>
      )}
      {visible.map((c) => {
        const active = c.slug === filters.cat;
        return (
          <Link key={c.slug} href={buildShopUrl(filters, { cat: c.slug })} aria-current={active ? "true" : undefined} className={cn("chip shrink-0 snap-start", active && "chip-active")}>
            {c.name}
            <span className={cn("text-[11px]", active ? "text-white/70" : "text-ink-400")}>{c.count}</span>
          </Link>
        );
      })}
    </div>
  );
}
