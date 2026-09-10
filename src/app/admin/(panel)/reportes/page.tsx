import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, Boxes, ChartColumnBig, Info, Mail, MessageCircle, PackageX, ShoppingCart, Users } from "lucide-react";
import { formatCLP, formatDateTime, cn } from "@/lib/format";
import { PAYMENT_METHOD, ORDER_CHANNEL, whatsappTo } from "@/components/admin/labels";
import { PageHeader } from "@/components/admin/PageHeader";
import { resolveRange, withRange, type ReportRange } from "./_lib/range";
import {
  getSalesSummary,
  getByPaymentMethod,
  getSeries,
  getTopByUnits,
  getTopByRevenue,
  getSoldOut,
  getUnlinkedUnits,
  getByCategory,
  getByBrand,
  getAbandoned,
  getAbandonedSummary,
  getTopCustomers,
  getCustomerMix,
  getInventory,
  type GroupRow,
} from "./_lib/queries";
import { RangeBar } from "./RangeBar";
import { SalesChart } from "./SalesChart";
import { ProductList } from "./ProductList";
import { Delta, StatCard, Section, ExportLink, Share, pct } from "./parts";

export const metadata: Metadata = { title: "Reportes" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const ordCat = str(sp.ordCat) === "unidades" ? "unidades" : "ingresos";
  const ordMarca = str(sp.ordMarca) === "unidades" ? "unidades" : "ingresos";
  const sorts = { ordCat: ordCat === "ingresos" ? undefined : ordCat, ordMarca: ordMarca === "ingresos" ? undefined : ordMarca };

  const [summary, prev, payments, series, topUnits, topRevenue, soldOut, unlinked, categories, brands, abandoned, abandonedSummary, customers, mix, inventory] = await Promise.all([
    getSalesSummary(range.from, range.to),
    range.prevFrom && range.prevTo ? getSalesSummary(range.prevFrom, range.prevTo) : Promise.resolve(null),
    getByPaymentMethod(range.from, range.to),
    getSeries(range),
    getTopByUnits(range, 20),
    getTopByRevenue(range, 20),
    getSoldOut(range, 20),
    getUnlinkedUnits(range),
    getByCategory(range, 60),
    getByBrand(range, 60),
    getAbandoned(range, 50),
    getAbandonedSummary(range),
    getTopCustomers(range, 20),
    getCustomerMix(range),
    getInventory(),
  ]);

  const { all } = summary;
  const sortRows = (rows: GroupRow[], by: "ingresos" | "unidades") => [...rows].sort((a, b) => (by === "unidades" ? b.units - a.units || b.revenue - a.revenue : b.revenue - a.revenue || b.units - a.units));
  const catRows = sortRows(categories, ordCat);
  const brandRows = sortRows(brands, ordMarca);
  const clientes = mix.nuevos + mix.recurrentes;

  return (
    <>
      <PageHeader title="Reportes" description={<>Ventas, productos, clientes e inventario · {range.label}</>}>
        <ExportLink range={range} report="ventas" label="Exportar ventas" />
      </PageHeader>

      <RangeBar range={range} />

      {/* ---------------------------------------------------- 1. resumen */}
      <section className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Vendido" value={formatCLP(all.total)} tone="dark" delta={<Delta current={all.total} previous={prev?.all.total ?? null} />} sub={prev ? "vs. periodo anterior" : undefined} />
        <StatCard label="Pedidos" value={all.orders.toLocaleString("es-CL")} delta={<Delta current={all.orders} previous={prev?.all.orders ?? null} />} />
        <StatCard label="Ticket promedio" value={formatCLP(all.ticket)} delta={<Delta current={all.ticket} previous={prev?.all.ticket ?? null} />} />
        <StatCard label="Unidades" value={all.units.toLocaleString("es-CL")} delta={<Delta current={all.units} previous={prev?.all.units ?? null} />} />
      </section>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
        {/* Web vs manual */}
        <div className="card min-w-0 p-4 md:p-5">
          <h2 className="mb-3 text-base">Web vs. venta presencial</h2>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { label: "Web", data: summary.web, previous: prev?.web ?? null, hint: "Checkout online + WooCommerce" },
                { label: "Manual", data: summary.manual, previous: prev?.manual ?? null, hint: "Venta rápida + app WooCommerce" },
              ] as const
            ).map((c) => (
              <div key={c.label} className="min-w-0 rounded-xl bg-ink-50 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{c.label}</div>
                <div className="mt-0.5 truncate text-lg font-black tabular-nums">{formatCLP(c.data.total)}</div>
                <div className="text-xs text-ink-500">
                  {c.data.orders} ped. · {pct(c.data.total, all.total)}
                </div>
                <Delta className="mt-1" current={c.data.total} previous={c.previous?.total ?? null} />
                <div className="mt-1 text-[11px] leading-tight text-ink-400">{c.hint}</div>
              </div>
            ))}
          </div>
          {summary.byChannel.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-xs">
              {summary.byChannel.map((c) => (
                <li key={c.channel} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink-600">{ORDER_CHANNEL[c.channel].label}</span>
                  <span className="shrink-0 font-bold tabular-nums">{formatCLP(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Métodos de pago */}
        <div className="card min-w-0 p-4 md:p-5">
          <h2 className="mb-3 text-base">Métodos de pago</h2>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">Sin ventas en este rango.</p>
          ) : (
            <ul className="space-y-2.5">
              {payments.map((p) => (
                <li key={p.method} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{PAYMENT_METHOD[p.method]}</span>
                    <span className="shrink-0 font-bold tabular-nums">{formatCLP(p.total)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Share value={p.total} max={payments[0].total} />
                    <span className="shrink-0 text-[11px] tabular-nums text-ink-400">
                      {pct(p.total, all.total)} · {p.orders} ped.
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ------------------------------------------- 2. ventas en el tiempo */}
      <Section
        title="Ventas en el tiempo"
        description={
          <>
            <ChartColumnBig className="mr-1 inline size-3.5 align-[-2px]" />
            Agrupado {range.bucket === "day" ? "por día" : range.bucket === "week" ? "por semana" : "por mes"} · hora de Chile
          </>
        }
        range={range}
        report="ventas"
      >
        <SalesChart series={series} bucket={range.bucket} />
      </Section>

      {/* ------------------------------------------ 3. productos más vendidos */}
      <Section
        title="Productos más vendidos"
        description={unlinked > 0 ? `${unlinked.toLocaleString("es-CL")} unidades del periodo corresponden a productos que ya no están en el catálogo y quedan fuera de estos rankings.` : "Top 20 del rango por unidades y por ingresos."}
        range={range}
        report="productos"
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">Por unidades</h3>
            <ProductList rows={topUnits} highlight="units" empty="Sin ventas de productos del catálogo en este rango." />
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">Por ingresos</h3>
            <ProductList rows={topRevenue} highlight="revenue" empty="Sin ventas de productos del catálogo en este rango." />
          </div>
        </div>

        <h3 className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          <PackageX className="size-3.5 text-danger" /> Se vendieron y quedaron agotados
        </h3>
        <p className="mb-2 text-xs text-ink-500">Candidatos a reponer: los más vendidos del rango que hoy tienen stock 0.</p>
        <ProductList rows={soldOut} highlight="units" empty="Ningún producto vendido en el rango está agotado. ¡Bien ahí!" />
      </Section>

      {/* --------------------------------------- 4. categorías y marcas */}
      <Section title="Ventas por categoría y marca" description="Un producto puede pertenecer a varias categorías, así que la suma por categoría puede superar el total vendido." range={range} report="categorias">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <GroupTable title="Categorías" rows={catRows} totalRevenue={all.total} range={range} sortParam="ordCat" sortValue={ordCat} sorts={sorts} report="categorias" />
          <GroupTable title="Marcas" rows={brandRows} totalRevenue={all.total} range={range} sortParam="ordMarca" sortValue={ordMarca} sorts={sorts} report="marcas" />
        </div>
      </Section>

      {/* ------------------------------------ 5. checkouts sin completar */}
      <Section title="Checkouts sin completar" range={range} report="abandonados">
        <div className="card mb-3 flex gap-2 border-l-4 border-flame p-3 text-xs leading-relaxed text-ink-600">
          <Info className="mt-0.5 size-4 shrink-0 text-flame" />
          <p>
            El carrito de la tienda vive en el navegador del cliente (localStorage), así que <strong>no se puede reportar</strong>. Lo que ves aquí son <strong>checkouts iniciados</strong>: pedidos que sí se crearon en el
            sistema (el cliente dejó sus datos) pero quedaron pendientes y sin pagar.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          <StatCard label="Sin completar" value={abandonedSummary.count.toLocaleString("es-CL")} sub={abandonedSummary.count === 1 ? "checkout" : "checkouts"} />
          <StatCard label="Monto en juego" value={formatCLP(abandonedSummary.total)} sub="si se recuperaran todos" />
          <StatCard
            label="Conversión"
            value={abandonedSummary.conversion == null ? "—" : `${(abandonedSummary.conversion * 100).toFixed(1)}%`}
            sub={`${abandonedSummary.paid} pagados de ${abandonedSummary.paid + abandonedSummary.count}`}
            tone="lime"
          />
        </div>

        {abandoned.length === 0 ? (
          <p className="card mt-3 px-4 py-8 text-center text-sm text-ink-500">No hay checkouts sin completar en este rango.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {abandoned.map((o) => {
              const nombre = o.firstName?.trim() || "";
              const mensaje = `Hola ${nombre}, te escribimos de Tío Wheels. Vimos que dejaste tu pedido #${o.number} a medio camino, ¿te ayudamos a completarlo?`;
              const wa = whatsappTo(o.phone, mensaje);
              const mailto = o.email ? `mailto:${o.email}?subject=${encodeURIComponent(`Tu pedido #${o.number} en Tío Wheels`)}&body=${encodeURIComponent(mensaje)}` : null;
              return (
                <li key={o.id} className="card min-w-0 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-black tabular-nums hover:underline">
                      #{o.number}
                    </Link>
                    <span className="text-base font-bold tabular-nums">{formatCLP(o.total)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold">
                    {o.firstName} {o.lastName ?? ""}
                  </div>
                  <div className="mt-0.5 break-words text-xs text-ink-500">
                    {formatDateTime(o.createdAt)} · {PAYMENT_METHOD[o.paymentMethod]} · {o.items} {o.items === 1 ? "ítem" : "ítems"}
                  </div>
                  <div className="mt-0.5 break-words text-xs text-ink-500">{[o.email, o.phone].filter(Boolean).join(" · ") || "Sin contacto"}</div>
                  {o.products && <p className="mt-1.5 line-clamp-2 text-xs text-ink-600">{o.products}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-lime btn-sm">
                        <MessageCircle className="size-4" /> WhatsApp
                      </a>
                    )}
                    {mailto && (
                      <a href={mailto} className="btn-outline btn-sm">
                        <Mail className="size-4" /> Correo
                      </a>
                    )}
                    <Link href={`/admin/pedidos/${o.id}`} className="btn-ghost btn-sm">
                      Ver pedido
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* ------------------------------------------------------ 6. clientes */}
      <Section title="Clientes" description="Se identifican por cuenta y, si compraron sin registrarse, por su correo." range={range} report="clientes">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Compraron" value={clientes.toLocaleString("es-CL")} sub={clientes === 1 ? "cliente" : "clientes"} />
          <StatCard label="Nuevos" value={mix.nuevos.toLocaleString("es-CL")} sub={pct(mix.nuevos, clientes)} tone="lime" />
          <StatCard label="Recurrentes" value={mix.recurrentes.toLocaleString("es-CL")} sub={pct(mix.recurrentes, clientes)} />
          <StatCard label="Gasto medio" value={formatCLP(clientes ? Math.round(all.total / clientes) : 0)} sub="por cliente" />
        </div>

        <h3 className="mb-2 mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          <Users className="size-3.5" /> Mejores clientes del rango
        </h3>
        {customers.length === 0 ? (
          <p className="card px-4 py-8 text-center text-sm text-ink-500">Sin ventas en este rango.</p>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <ul className="space-y-2 md:hidden">
              {customers.map((c, i) => (
                <li key={c.key} className="card flex min-w-0 items-center gap-3 p-3">
                  <span className="w-5 shrink-0 text-center text-xs font-black tabular-nums text-ink-300">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.name || c.email || "Sin nombre"}</div>
                    <div className="truncate text-xs text-ink-500">{c.email ?? c.phone ?? "Sin contacto"}</div>
                    <div className="text-xs text-ink-500">
                      {c.orders} {c.orders === 1 ? "pedido" : "pedidos"}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums">{formatCLP(c.total)}</span>
                </li>
              ))}
            </ul>
            {/* Escritorio: tabla */}
            <div className="card hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3 text-right">Pedidos</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {customers.map((c, i) => (
                    <tr key={c.key} className="transition hover:bg-lime-50/60">
                      <td className="px-4 py-2.5 tabular-nums text-ink-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-semibold">
                        {c.userId ? (
                          <Link href={`/admin/clientes/${c.userId}`} className="hover:underline">
                            {c.name || c.email || "Sin nombre"}
                          </Link>
                        ) : (
                          (c.name || c.email || "Sin nombre")
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-500">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.orders}</td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatCLP(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* ---------------------------------------------------- 7. inventario */}
      <Section title="Inventario" description="Foto de hoy: no depende del rango elegido." range={range} report="inventario">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Valor del stock" value={formatCLP(inventory.value)} sub="precio × unidades" tone="dark" />
          <StatCard label="Unidades" value={inventory.units.toLocaleString("es-CL")} sub={`${inventory.products.toLocaleString("es-CL")} productos`} />
          <StatCard label="Última unidad" value={inventory.lastUnit.toLocaleString("es-CL")} sub="con stock 1" />
          <StatCard label="Agotados" value={inventory.outOfStock.toLocaleString("es-CL")} sub="stock 0" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/productos?disp=ultimo" className="btn-outline btn-sm">
            <AlertTriangle className="size-4" /> Ver última unidad
          </Link>
          <Link href="/admin/productos?disp=agotado" className="btn-outline btn-sm">
            <Boxes className="size-4" /> Ver agotados
          </Link>
        </div>
        {soldOut.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
              <ShoppingCart className="size-3.5" /> Reponer primero
            </h3>
            <ProductList rows={soldOut} highlight="units" empty="" />
          </>
        )}
      </Section>

      <p className="mt-8 text-center text-xs text-ink-400">
        Se cuentan como venta los pedidos pagados, en preparación, enviados y completados. Cancelados y reembolsados quedan fuera. Fechas en hora de Chile.
      </p>
    </>
  );
}

/** Tabla de categorías o marcas, ordenable por ingresos o unidades. */
function GroupTable({
  title,
  rows,
  totalRevenue,
  range,
  sortParam,
  sortValue,
  sorts,
  report,
}: {
  title: string;
  rows: GroupRow[];
  totalRevenue: number;
  range: ReportRange;
  sortParam: "ordCat" | "ordMarca";
  sortValue: "ingresos" | "unidades";
  sorts: Record<string, string | undefined>;
  report: string;
}) {
  const max = rows[0] ? Math.max(...rows.map((r) => (sortValue === "unidades" ? r.units : r.revenue))) : 0;
  const href = (v: "ingresos" | "unidades") => withRange("/admin/reportes", range, { ...sorts, [sortParam]: v === "ingresos" ? undefined : v });
  const th = (label: string, v: "ingresos" | "unidades") => (
    <Link href={`${href(v)}#${sortParam}`} className={cn("inline-flex items-center gap-1 hover:text-ink", sortValue === v && "text-ink underline")}>
      {label} <ArrowUpDown className="size-3" />
    </Link>
  );

  return (
    <div className="min-w-0" id={sortParam}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{title}</h3>
        <ExportLink range={range} report={report} />
      </div>
      {rows.length === 0 ? (
        <p className="card px-4 py-8 text-center text-sm text-ink-500">Sin datos en este rango.</p>
      ) : (
        <div className="card min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-3 py-2.5">Nombre</th>
                <th className="px-3 py-2.5 text-right">{th("Unid.", "unidades")}</th>
                <th className="px-3 py-2.5 text-right">{th("Ingresos", "ingresos")}</th>
                <th className="px-3 py-2.5 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.slice(0, 25).map((r) => (
                <tr key={r.key}>
                  <td className="max-w-0 px-3 py-2">
                    <div className="truncate" title={r.name}>
                      {r.name}
                    </div>
                    <Share value={sortValue === "unidades" ? r.units : r.revenue} max={max} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.units.toLocaleString("es-CL")}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{formatCLP(r.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-500">{pct(r.revenue, totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 25 && <p className="px-3 py-2 text-center text-[11px] text-ink-400">Se muestran las 25 primeras de {rows.length}. El CSV trae todas.</p>}
        </div>
      )}
    </div>
  );
}
