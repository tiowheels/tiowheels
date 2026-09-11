import Link from "next/link";
import { X } from "lucide-react";
import { buildShopUrl, type ShopQuery } from "@/lib/shop-url";
import { formatCLP } from "@/lib/format";

type Chip = { key: string; label: string; href: string };

export function ActiveFilters({ filters, catName }: { filters: ShopQuery; catName?: string | null }) {
  const chips: Chip[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, href: buildShopUrl(filters, { q: undefined }) });
  if (filters.cat) chips.push({ key: "cat", label: catName ?? filters.cat, href: buildShopUrl(filters, { cat: undefined }) });
  if (filters.min != null || filters.max != null) {
    const label = filters.min != null && filters.max != null ? `${formatCLP(filters.min)} – ${formatCLP(filters.max)}` : filters.min != null ? `Desde ${formatCLP(filters.min)}` : `Hasta ${formatCLP(filters.max!)}`;
    chips.push({ key: "precio", label, href: buildShopUrl(filters, { min: undefined, max: undefined }) });
  }
  if (filters.agotados) chips.push({ key: "disp", label: "Incluye agotados", href: buildShopUrl(filters, { agotados: undefined }) });

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      {chips.map((c) => (
        <Link key={c.key} href={c.href} className="chip chip-active h-auto min-h-8 py-1 pr-2 text-left" aria-label={`Quitar filtro ${c.label}`} scroll>
          {c.label}
          <span className="flex size-5 items-center justify-center rounded-full bg-white/15">
            <X className="size-3" aria-hidden />
          </span>
        </Link>
      ))}
      <Link href={buildShopUrl({ orden: filters.orden })} className="text-[13px] font-semibold text-ink-500 underline-offset-4 hover:text-ink hover:underline">
        Limpiar todo
      </Link>
    </div>
  );
}
