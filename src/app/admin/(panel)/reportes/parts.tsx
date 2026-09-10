import { ArrowDownRight, ArrowUpRight, Download, Minus } from "lucide-react";
import { cn } from "@/lib/format";
import { withRange, type ReportRange } from "./_lib/range";

/** Variación porcentual contra el periodo anterior. */
export function Delta({ current, previous, className }: { current: number; previous: number | null; className?: string }) {
  if (previous == null) return null;
  if (previous <= 0) {
    if (current <= 0) return <span className={cn("text-xs font-semibold text-ink-400", className)}>Sin datos antes</span>;
    return <span className={cn("text-xs font-bold text-success", className)}>Nuevo</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const flat = Math.abs(pct) < 0.5;
  const Icon = flat ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", flat ? "text-ink-400" : pct > 0 ? "text-success" : "text-danger", className)}>
      <Icon className="size-3.5 shrink-0" />
      {flat ? "0%" : `${pct > 0 ? "+" : ""}${pct.toFixed(pct > -10 && pct < 10 ? 1 : 0)}%`}
    </span>
  );
}

export function StatCard({ label, value, sub, delta, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; delta?: React.ReactNode; tone?: "dark" | "lime" }) {
  return (
    <div className={cn("card min-w-0 p-4", tone === "dark" && "bg-ink text-white", tone === "lime" && "bg-lime")}>
      <div className={cn("text-[11px] font-bold uppercase tracking-wider", tone === "dark" ? "text-lime" : "text-ink-500")}>{label}</div>
      <div className="mt-1 truncate text-xl font-black tabular-nums md:text-2xl">{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {delta}
        {sub && <span className={cn("text-xs", tone === "dark" ? "text-ink-300" : "text-ink-500")}>{sub}</span>}
      </div>
    </div>
  );
}

/** Cabecera de sección con su botón de exportación a CSV. */
export function Section({ id, title, description, range, report, children }: { id?: string; title: string; description?: React.ReactNode; range: ReportRange; report?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-6 min-w-0 scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
        </div>
        {report && <ExportLink range={range} report={report} />}
      </div>
      {children}
    </section>
  );
}

export function ExportLink({ range, report, label = "CSV" }: { range: ReportRange; report: string; label?: string }) {
  return (
    <a href={withRange("/admin/api/reportes/export", range, { reporte: report })} className="btn-outline btn-sm shrink-0" download>
      <Download className="size-4" /> {label}
    </a>
  );
}

/** Barra de proporción para tablas de categorías/marcas. */
export function Share({ value, max }: { value: number; max: number }) {
  return (
    <span className="block h-1.5 w-full min-w-8 overflow-hidden rounded-full bg-ink-100">
      <span className="block h-full rounded-full bg-lime" style={{ width: `${max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0}%` }} />
    </span>
  );
}

export const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—");
