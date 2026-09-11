import type { Metadata } from "next";
import Link from "next/link";
import { Search, Truck, Zap } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { db, OrderStatus, OrderChannel } from "@/lib/db";
import { formatCLP, formatDateTime } from "@/lib/format";
import { parseYmdSantiago, addDays } from "@/app/admin/_lib/dates";
import { ORDER_STATUS, ORDER_CHANNEL, PAYMENT_METHOD } from "@/components/admin/labels";
import { OrderStatusBadge, ChannelBadge, PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { FilterForm, CollapsibleFilters } from "@/components/admin/FilterForm";
import { after } from "next/server";
import { expirarPedidosSinPago } from "@/lib/orders";
export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";
const PER_PAGE = 30;
type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  // Libera el stock de los pedidos que quedaron sin pagar
  after(() => expirarPedidosSinPago());
  const sp = await searchParams;
  const q = str(sp.q).trim();
  const estado = str(sp.estado);
  const canal = str(sp.canal);
  const desde = str(sp.desde);
  const hasta = str(sp.hasta);
  const page = Math.max(1, parseInt(str(sp.page) || "1", 10) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (estado && estado in ORDER_STATUS) where.status = estado as OrderStatus;
  if (canal && canal in ORDER_CHANNEL) where.channel = canal as OrderChannel;
  const from = parseYmdSantiago(desde);
  const to = parseYmdSantiago(hasta);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: addDays(to, 1) } : {}) };
  if (q) {
    const num = /^#?\d+$/.test(q) ? parseInt(q.replace("#", ""), 10) : null;
    const digits = q.replace(/\D/g, "");
    where.OR = [
      ...(num != null ? [{ number: num }, { legacyId: num }] : []),
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 6 ? [{ phone: { contains: digits.slice(-8) } }] : []),
      { phone: { contains: q } },
    ];
  }
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, number: true, firstName: true, lastName: true, email: true, phone: true, total: true, status: true, channel: true, paymentMethod: true, paymentStatus: true, createdAt: true, trackingCode: true, carrier: true, _count: { select: { items: true } } },
    }),
    db.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const params = { q, estado, canal, desde, hasta };
  const hasFilters = Boolean(q || estado || canal || desde || hasta);
  return (
    <>
      <PageHeader title="Pedidos" description={`${total.toLocaleString("es-CL")} ${total === 1 ? "pedido" : "pedidos"}${hasFilters ? " con estos filtros" : ""}`}>
        <Link href="/admin/venta-rapida" className="btn-lime btn-md">
          <Zap className="size-4" /> Venta rápida
        </Link>
      </PageHeader>
      <FilterForm action="/admin/pedidos" className="card mb-4 space-y-2 p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input type="search" name="q" defaultValue={q} enterKeyHint="search" placeholder="N°, nombre, correo o teléfono" className="input pl-10" />
        </label>
        <CollapsibleFilters active={[estado, canal, desde, hasta].filter(Boolean).length} className="sm:grid-cols-2 lg:grid-cols-4">
        <select name="estado" defaultValue={estado} className="input" aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select name="canal" defaultValue={canal} className="input" aria-label="Canal">
          <option value="">Todos los canales</option>
          {Object.entries(ORDER_CHANNEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <input type="date" name="desde" defaultValue={desde} className="input" aria-label="Desde" />
        <input type="date" name="hasta" defaultValue={hasta} className="input" aria-label="Hasta" />
        </CollapsibleFilters>
        {hasFilters && (
          <Link href="/admin/pedidos" className="btn-ghost btn-md">
            Limpiar filtros
          </Link>
        )}
      </FilterForm>
      {orders.length === 0 ? (
        <EmptyState title="No hay pedidos" text={hasFilters ? "Prueba con otros filtros o limpia la búsqueda." : "Cuando registres una venta o entre un pedido web aparecerá aquí."}>
          {hasFilters && (
            <Link href="/admin/pedidos" className="btn-outline btn-md">
              Limpiar filtros
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          {/* Móvil: tarjetas */}
          <ul className="space-y-2 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="card block p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black tabular-nums">#{o.number}</span>
                    <span className="text-base font-bold tabular-nums">{formatCLP(o.total)}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">
                    {o.firstName} {o.lastName ?? ""}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {formatDateTime(o.createdAt)} · {o._count.items} {o._count.items === 1 ? "ítem" : "ítems"} · {PAYMENT_METHOD[o.paymentMethod]}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <OrderStatusBadge status={o.status} />
                    <ChannelBadge channel={o.channel} />
                    {o.paymentStatus !== "PAID" && <PaymentStatusBadge status={o.paymentStatus} />}
                    {o.trackingCode && <TrackingBadge carrier={o.carrier} code={o.trackingCode} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {/* Escritorio: tabla */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-lime-50/60">
                    <td className="px-4 py-3 font-black tabular-nums">
                      <Link href={`/admin/pedidos/${o.id}`} className="block">
                        #{o.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-600">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/pedidos/${o.id}`} className="block">
                        <div className="font-semibold">
                          {o.firstName} {o.lastName ?? ""}
                        </div>
                        <div className="text-xs text-ink-500">{o.email ?? o.phone ?? "—"}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={o.channel} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{PAYMENT_METHOD[o.paymentMethod]}</div>
                      {o.paymentStatus !== "PAID" && <PaymentStatusBadge status={o.paymentStatus} className="mt-1" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <OrderStatusBadge status={o.status} />
                        {o.trackingCode && <TrackingBadge carrier={o.carrier} code={o.trackingCode} />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCLP(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={total} perPage={PER_PAGE} basePath="/admin/pedidos" params={params} />
        </>
      )}
    </>
  );
}
/** Icono que indica que el pedido tiene código de seguimiento. */
function TrackingBadge({ carrier, code }: { carrier: string | null; code: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-ink-100 px-2 text-[11px] font-bold text-ink-700" title={`${carrier ?? "Courier"} · ${code}`}>
      <Truck className="size-3.5" />
      <span className="sr-only">Con seguimiento: </span>
      <span className="hidden lg:inline">{carrier ?? "Envío"}</span>
    </span>
  );
}