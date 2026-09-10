import Link from "next/link";
import { formatCLP, cn } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import type { ProductRow } from "./_lib/queries";

/** Listado compacto de productos vendidos: miniatura, marca en gris, unidades, ingresos y stock. */
export function ProductList({ rows, highlight = "units", empty }: { rows: ProductRow[]; highlight?: "units" | "revenue"; empty: string }) {
  if (rows.length === 0) return <p className="card px-4 py-8 text-center text-sm text-ink-500">{empty}</p>;
  return (
    <ol className="card divide-y divide-ink-100">
      {rows.map((p, i) => (
        <li key={p.id} className="flex min-w-0 items-center gap-3 p-3">
          <span className="w-5 shrink-0 text-center text-xs font-black tabular-nums text-ink-300">{i + 1}</span>
          <img src={mediaUrl(p.image, "thumb")} alt="" className="size-11 shrink-0 rounded-lg bg-ink-50 object-contain" loading="lazy" />
          <div className="min-w-0 flex-1">
            <Link href={`/admin/productos/${p.id}`} className="line-clamp-2 text-[13px] font-semibold leading-tight hover:underline">
              {p.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-400">
              <span className="truncate">{p.brand || "Sin marca"}</span>
              <span aria-hidden>·</span>
              <span className={cn("font-semibold", p.stock <= 0 ? "text-danger" : p.stock === 1 ? "text-flame" : "text-ink-500")}>{p.stock <= 0 ? "Agotado" : `${p.stock} en stock`}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={cn("text-sm font-black tabular-nums", highlight === "revenue" && "text-[13px]")}>{highlight === "units" ? `${p.units} u.` : formatCLP(p.revenue)}</div>
            <div className="text-[11px] tabular-nums text-ink-500">{highlight === "units" ? formatCLP(p.revenue) : `${p.units} u.`}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
