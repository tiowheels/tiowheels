import type { Metadata } from "next";
import Link from "next/link";
import { Zap, ArrowRight, AlertTriangle, Clock, Package, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { formatCLP, formatDateTime, cn } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { startOfDaySantiago, addDays, startOfMonthSantiago, weekdayShort, dayMonth, ymdSantiago } from "@/app/admin/_lib/dates";
import { OrderStatusBadge, ChannelBadge } from "@/components/admin/StatusBadge";
import { InstallPwaButton } from "@/components/admin/InstallPwaButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { PendingOrderActions } from "@/components/admin/PendingOrderActions";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

const SALE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] as const;

async function kpi(from: Date, to?: Date) {
  const rows = await db.order.groupBy({
    by: ["channel"],
    where: { createdAt: { gte: from, ...(to ? { lt: to } : {}) }, status: { in: [...SALE_STATUSES] } },
    _sum: { total: true },
    _count: { _all: true },
  });
  const pick = (chs: string[]) => {
    const r = rows.filter((x) => chs.includes(x.channel));
    return { total: r.reduce((a, x) => a + (x._sum.total ?? 0), 0), count: r.reduce((a, x) => a + x._count._all, 0) };
  };
  const web = pick(["WEB", "LEGACY_WEB"]);
  const manual = pick(["MANUAL", "LEGACY_APP"]);
  return { web, manual, all: { total: web.total + manual.total, count: web.count + manual.count } };
}

export default async function AdminHome() {
  const now = new Date();
  const today = startOfDaySantiago(now);
  const week = addDays(today, -6);
  const month = startOfMonthSantiago(now);
  const chartFrom = addDays(today, -13);

  const [kToday, kWeek, kMonth, pending, lowStock, latest, daily, counts, unreadMessages] = await Promise.all([
    kpi(today),
    kpi(week),
    kpi(month),
    db.order.findMany({
      where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: { id: true, number: true, firstName: true, lastName: true, total: true, status: true, channel: true, paymentMethod: true, paymentStatus: true, createdAt: true, phone: true },
    }),
    db.product.findMany({
      where: { stock: 1, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, name: true, price: true, brand: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } },
    }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, number: true, firstName: true, lastName: true, total: true, status: true, channel: true, createdAt: true } }),
    db.$queryRaw<{ day: string; total: number; n: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'America/Santiago')::date, 'YYYY-MM-DD') AS day,
             coalesce(sum(total), 0)::int AS total, count(*)::int AS n
      FROM "Order"
      WHERE "createdAt" >= ${chartFrom} AND status IN ('PAID','PROCESSING','SHIPPED','COMPLETED')
      GROUP BY 1 ORDER BY 1`,
    Promise.all([db.product.count({ where: { status: "ACTIVE", stock: { gt: 0 } } }), db.product.count({ where: { stock: 1, status: "ACTIVE" } }), db.order.count({ where: { status: "PENDING" } })]),
    db.contactMessage.count({ where: { read: false } }),
  ]);

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(chartFrom, i);
    const key = ymdSantiago(d);
    const row = byDay.get(key);
    return { date: d, key, total: row?.total ?? 0, n: row?.n ?? 0 };
  });
  const maxTotal = Math.max(1, ...days.map((d) => d.total));

  return (
    <>
      <PageHeader title="Hola, Tío" description={`${counts[0].toLocaleString("es-CL")} productos con stock · ${counts[1]} con 1 unidad · ${counts[2]} pendientes de pago`}>
        <Link href="/admin/venta-rapida" className="btn-lime btn-lg hidden md:inline-flex">
          <Zap className="size-5" /> Venta rápida
        </Link>
      </PageHeader>

      {/* Venta rápida destacada en móvil */}
      <Link href="/admin/venta-rapida" className="mb-4 flex items-center justify-between rounded-card bg-ink p-4 text-white shadow-card md:hidden">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-lime text-ink">
            <Zap className="size-6" strokeWidth={2.5} />
          </span>
          <div>
            <div className="text-base font-bold">Registrar venta</div>
            <div className="text-xs text-ink-300">Feria, Instagram, presencial</div>
          </div>
        </div>
        <ArrowRight className="size-5 text-lime" />
      </Link>

      <InstallPwaButton asCard className="mt-3" />

      {/* Mensajes sin leer */}
      {unreadMessages > 0 && (
        <Link href="/admin/mensajes?filtro=no-leidos" className="card mb-4 flex items-center justify-between gap-3 border-l-4 border-lime p-4 transition hover:shadow-pop">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
              <Inbox className="size-5" />
            </span>
            <div>
              <div className="text-base font-bold">
                {unreadMessages} {unreadMessages === 1 ? "mensaje sin leer" : "mensajes sin leer"}
              </div>
              <div className="text-xs text-ink-500">Consultas enviadas desde el formulario de contacto</div>
            </div>
          </div>
          <ArrowRight className="size-5 shrink-0 text-ink-400" />
        </Link>
      )}

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard title="Hoy" data={kToday} highlight />
        <KpiCard title="Últimos 7 días" data={kWeek} />
        <KpiCard title="Este mes" data={kMonth} />
      </section>

      {/* Gráfico 14 días */}
      <section className="card mt-4 p-4 md:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base">Ventas por día · últimos 14 días</h2>
          <span className="text-xs text-ink-500">{formatCLP(days.reduce((a, d) => a + d.total, 0))} en total</span>
        </div>
        <div className="flex h-40 items-end gap-1 sm:gap-2">
          {days.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white group-hover:block">
                {formatCLP(d.total)} · {d.n} {d.n === 1 ? "venta" : "ventas"}
              </div>
              <div
                className={cn("w-full rounded-t-md transition", d.total > 0 ? "bg-lime group-hover:bg-lime-600" : "bg-ink-100")}
                style={{ height: `${Math.max(d.total > 0 ? 6 : 2, Math.round((d.total / maxTotal) * 100))}%` }}
                title={`${dayMonth(d.date)}: ${formatCLP(d.total)}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1 sm:gap-2">
          {days.map((d, i) => (
            <div key={d.key} className="flex-1 text-center text-[10px] leading-tight text-ink-400">
              <span className="hidden sm:block">{weekdayShort(d.date)}</span>
              <span className={cn(i % 2 === 1 && "hidden sm:block")}>{dayMonth(d.date).slice(0, 2)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        {/* Pendientes */}
        <section className="card min-w-0 p-4 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-flame" /> Por atender
            </h2>
            <Link href="/admin/pedidos?estado=PENDING" className="text-xs font-semibold text-ink-500 hover:text-ink">
              Ver todos →
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">Nada pendiente. ¡Todo al día!</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {pending.map((o) => (
                <li key={o.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="min-w-0 flex-1 basis-40">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-bold tabular-nums">#{o.number}</span>
                      <OrderStatusBadge status={o.status} />
                      <ChannelBadge channel={o.channel} />
                    </div>
                    <div className="mt-0.5 truncate text-sm text-ink-700">
                      {o.firstName} {o.lastName ?? ""} · {formatCLP(o.total)} · {formatDateTime(o.createdAt)}
                    </div>
                  </Link>
                  <PendingOrderActions order={{ id: o.id, number: o.number, status: o.status, paymentStatus: o.paymentStatus, firstName: o.firstName, phone: o.phone, total: o.total }} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Stock 1 */}
        <section className="card min-w-0 p-4 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-flame" /> Última unidad
            </h2>
            <Link href="/admin/productos?disp=ultimo" className="text-xs font-semibold text-ink-500 hover:text-ink">
              Ver todos →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">No hay productos con 1 unidad.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3 py-2.5">
                    <img src={mediaUrl(p.images[0]?.path, "thumb")} alt="" className="size-11 shrink-0 rounded-lg bg-ink-50 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-ink-500">{p.brand ?? "Sin marca"}</div>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatCLP(p.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Últimos pedidos */}
      <section className="card mt-4 p-4 md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base">
            <Package className="size-4" /> Últimos pedidos
          </h2>
          <Link href="/admin/pedidos" className="text-xs font-semibold text-ink-500 hover:text-ink">
            Ver todos →
          </Link>
        </div>
        <ul className="divide-y divide-ink-100">
          {latest.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 py-2.5">
                <span className="w-16 shrink-0 font-bold tabular-nums">#{o.number}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {o.firstName} {o.lastName ?? ""}
                </span>
                <ChannelBadge channel={o.channel} className="hidden sm:inline-flex" />
                <OrderStatusBadge status={o.status} />
                <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums">{formatCLP(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function KpiCard({ title, data, highlight }: { title: string; data: Awaited<ReturnType<typeof kpi>>; highlight?: boolean }) {
  return (
    <div className={cn("card p-4 md:p-5", highlight && "bg-ink text-white")}>
      <div className={cn("text-xs font-bold uppercase tracking-wider", highlight ? "text-lime" : "text-ink-500")}>{title}</div>
      <div className="mt-1 text-2xl font-black tabular-nums md:text-3xl">{formatCLP(data.all.total)}</div>
      <div className={cn("text-sm", highlight ? "text-ink-300" : "text-ink-500")}>
        {data.all.count} {data.all.count === 1 ? "venta" : "ventas"}
      </div>
      <div className={cn("mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs", highlight ? "border-white/10" : "border-ink-100")}>
        <div>
          <div className={cn("font-semibold", highlight ? "text-ink-300" : "text-ink-500")}>Web</div>
          <div className="font-bold tabular-nums">{formatCLP(data.web.total)}</div>
          <div className={highlight ? "text-ink-400" : "text-ink-400"}>{data.web.count} ped.</div>
        </div>
        <div>
          <div className={cn("font-semibold", highlight ? "text-ink-300" : "text-ink-500")}>Manual</div>
          <div className="font-bold tabular-nums">{formatCLP(data.manual.total)}</div>
          <div className={highlight ? "text-ink-400" : "text-ink-400"}>{data.manual.count} ped.</div>
        </div>
      </div>
    </div>
  );
}
