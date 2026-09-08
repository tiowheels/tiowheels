import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildShopUrl, type ShopQuery } from "@/lib/shop-url";
import { cn } from "@/lib/format";

function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set<number>([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i] - list[i - 1] > 1) out.push("…");
    out.push(list[i]);
  }
  return out;
}

export function Pagination({ filters, page, pages, className }: { filters: ShopQuery; page: number; pages: number; className?: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => buildShopUrl(filters, { page: p });
  const items = pageWindow(page, pages);
  const btn = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition";

  return (
    <nav aria-label="Paginación" className={cn("flex items-center justify-center gap-1.5", className)}>
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" aria-label="Página anterior" className={cn(btn, "border border-ink-200 bg-white hover:border-ink")}>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Anterior</span>
        </Link>
      ) : (
        <span aria-disabled className={cn(btn, "border border-ink-100 text-ink-300")}>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Anterior</span>
        </span>
      )}

      <ul className="flex items-center gap-1">
        {items.map((it, i) =>
          it === "…" ? (
            <li key={`e${i}`} className="px-1 text-ink-400" aria-hidden>
              …
            </li>
          ) : (
            <li key={it}>
              {it === page ? (
                <span aria-current="page" className={cn(btn, "bg-ink text-white")}>
                  {it}
                </span>
              ) : (
                <Link href={href(it)} aria-label={`Página ${it}`} className={cn(btn, "hover:bg-ink-50")}>
                  {it}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>

      {page < pages ? (
        <Link href={href(page + 1)} rel="next" aria-label="Página siguiente" className={cn(btn, "border border-ink-200 bg-white hover:border-ink")}>
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span aria-disabled className={cn(btn, "border border-ink-100 text-ink-300")}>
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
