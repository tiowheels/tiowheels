import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/format";
import { FilterForm } from "@/components/admin/FilterForm";
import { RANGE_PRESETS, type ReportRange } from "./_lib/range";

/** Atajos de rango + fechas a medida. Todo viaja por query string. */
export function RangeBar({ range }: { range: ReportRange }) {
  return (
    <div className="card mb-4 p-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
        {RANGE_PRESETS.map((p) => (
          <Link key={p.key} href={`/admin/reportes?rango=${p.key}`} className={cn("chip shrink-0", range.key === p.key && "chip-active")} aria-current={range.key === p.key ? "true" : undefined}>
            {p.label}
          </Link>
        ))}
      </div>
      <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <CalendarRange className="size-4" /> O elige fechas a medida
      </p>
      <FilterForm action="/admin/reportes" className="grid gap-2 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-semibold text-ink-400">Desde</span>
          <input type="date" name="desde" defaultValue={range.key === "custom" ? range.desde : ""} className="input" />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-semibold text-ink-400">Hasta</span>
          <input type="date" name="hasta" defaultValue={range.key === "custom" ? range.hasta : ""} className="input" />
        </label>
      </FilterForm>
    </div>
  );
}
