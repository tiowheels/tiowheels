import { formatCLP, cn } from "@/lib/format";
import { bucketLabel, bucketTick, type Bucket } from "./_lib/range";
import type { SeriesPoint } from "./_lib/queries";

/** Gráfico de barras en CSS puro (sin librerías) + detalle en tabla. */
export function SalesChart({ series, bucket }: { series: SeriesPoint[]; bucket: Bucket }) {
  const max = Math.max(1, ...series.map((p) => p.total));
  const total = series.reduce((a, p) => a + p.total, 0);
  const orders = series.reduce((a, p) => a + p.orders, 0);
  const units = series.reduce((a, p) => a + p.units, 0);
  // Con muchas barras solo etiquetamos algunas para que no se encimen.
  const every = Math.ceil(series.length / 12);

  return (
    <>
      <div className="card min-w-0 p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">
            {bucket === "day" ? "Por día" : bucket === "week" ? "Por semana" : "Por mes"} · {series.length} {series.length === 1 ? "punto" : "puntos"}
          </span>
          <span className="text-xs text-ink-500">
            {formatCLP(total)} · {orders.toLocaleString("es-CL")} {orders === 1 ? "pedido" : "pedidos"}
          </span>
        </div>
        {series.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">No hay ventas en este rango.</p>
        ) : (
          <>
            <div className="flex h-44 items-end gap-px sm:gap-1">
              {series.map((p) => (
                <div key={p.key} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white shadow-card group-hover:block">
                    <span className="block text-lime">{bucketLabel(p.key, bucket)}</span>
                    {formatCLP(p.total)} · {p.orders} {p.orders === 1 ? "pedido" : "pedidos"}
                  </div>
                  <div
                    className={cn("w-full rounded-t-sm transition sm:rounded-t-md", p.total > 0 ? "bg-lime group-hover:bg-lime-600" : "bg-ink-100")}
                    style={{ height: `${Math.max(p.total > 0 ? 4 : 2, Math.round((p.total / max) * 100))}%` }}
                    title={`${bucketLabel(p.key, bucket)}: ${formatCLP(p.total)} · ${p.orders} ${p.orders === 1 ? "pedido" : "pedidos"}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-px sm:gap-1">
              {series.map((p, i) => (
                <div key={p.key} className="min-w-0 flex-1 truncate text-center text-[10px] leading-tight text-ink-400">
                  {i % every === 0 ? bucketTick(p.key, bucket) : ""}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {series.length > 0 && (
        <div className="card mt-3 min-w-0 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead className="bg-ink-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-3 py-2.5 md:px-4">Periodo</th>
                <th className="px-3 py-2.5 text-right md:px-4">Pedidos</th>
                <th className="px-3 py-2.5 text-right md:px-4">Unid.</th>
                <th className="px-3 py-2.5 text-right md:px-4">Vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {series.map((p) => (
                <tr key={p.key} className={cn(p.total === 0 && "text-ink-400")}>
                  <td className="px-3 py-2 md:px-4">{bucketLabel(p.key, bucket)}</td>
                  <td className="px-3 py-2 text-right tabular-nums md:px-4">{p.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums md:px-4">{p.units}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums md:px-4">{formatCLP(p.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink-100 bg-ink-50 font-bold">
              <tr>
                <td className="px-3 py-2.5 md:px-4">Total</td>
                <td className="px-3 py-2.5 text-right tabular-nums md:px-4">{orders.toLocaleString("es-CL")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums md:px-4">{units.toLocaleString("es-CL")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums md:px-4">{formatCLP(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
