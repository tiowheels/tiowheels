import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

/** Paginación por query string conservando el resto de filtros. */
export function Pagination({ page, pages, total, basePath, params, perPage }: { page: number; pages: number; total: number; basePath: string; params: Record<string, string | undefined>; perPage: number }) {
  if (pages <= 1 && total <= perPage) return total > 0 ? <p className="mt-4 text-center text-xs text-ink-500">{total.toLocaleString("es-CL")} resultados</p> : null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-xs text-ink-500">
        {from.toLocaleString("es-CL")}–{to.toLocaleString("es-CL")} de {total.toLocaleString("es-CL")}
      </span>
      <div className="flex items-center gap-2">
        <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn("btn-outline size-11 !p-0", page <= 1 && "pointer-events-none opacity-40")}>
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-sm font-semibold tabular-nums">
          {page} / {pages}
        </span>
        <Link aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))} className={cn("btn-outline size-11 !p-0", page >= pages && "pointer-events-none opacity-40")}>
          <ChevronRight className="size-5" />
        </Link>
      </div>
    </div>
  );
}
