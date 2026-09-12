import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { formatCLP, formatDateTime, formatRut } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { regionName } from "@/lib/chile";
import { ORDER_CHANNEL, PAYMENT_METHOD, SHIPPING_METHOD, whatsappTo, orderWhatsappMessage } from "@/components/admin/labels";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { OrderStatusBadge, ChannelBadge, PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";
import { hrefVolver } from "@/app/admin/_lib/volver";
import { OrderActions } from "@/components/admin/OrderActions";
import { ShippingForm } from "@/components/admin/ShippingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, select: { number: true } });
  return { title: o ? `Pedido #${o.number}` : "Pedido" };
}

function rawEntries(raw: unknown): [string, string][] {
  if (!raw || typeof raw !== "object") return [];
  const LABELS: Record<string, string> = {
    amount: "Monto",
    buyOrder: "Orden de compra",
    cardNumber: "Tarjeta (últimos 4)",
    paymentType: "Tipo de pago",
    transactionDate: "Fecha transacción",
    authorizationCode: "Código autorización",
    transactionStatus: "Estado",
    flowOrder: "N° Flow",
    status: "Estado Flow",
    payer: "Pagador",
    media: "Medio",
    date: "Fecha",
    source: "Origen",
    markedAt: "Marcado el",
  };
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null || v === "") continue;
    if (typeof v === "object") {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) if (v2 != null && typeof v2 !== "object") out.push([`${LABELS[k] ?? k} · ${LABELS[k2] ?? k2}`, String(v2)]);
    } else out.push([LABELS[k] ?? k, String(v)]);
  }
  return out;
}

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await db.order.findUnique({
    where: { id },
    include: { items: { orderBy: { name: "asc" }, include: { product: { select: { id: true, slug: true, stock: true } } } }, payments: { orderBy: { createdAt: "asc" } }, user: { select: { id: true, name: true, lastName: true, email: true } } },
  });
  if (!order) notFound();

  const address = [order.address1, order.address2, order.commune, order.city, regionName(order.region)].filter(Boolean).join(", ");
  const isLegacy = order.channel.startsWith("LEGACY");
  // Mensaje sugerido según el estado, igual que el botón grande de acciones
  const waCliente = whatsappTo(order.phone, orderWhatsappMessage(order));

  return (
    <>
      <PageHeader
        back={{ href: hrefVolver("/admin/pedidos", sp.volver) ?? "/admin/pedidos", label: sp.volver ? "Volver a la búsqueda" : "Pedidos" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Pedido #{order.number}
            <OrderStatusBadge status={order.status} />
          </span>
        }
        description={
          <>
            {formatDateTime(order.createdAt)} · {ORDER_CHANNEL[order.channel].label}
            {order.legacyId ? ` · Woo #${order.legacyId}` : ""}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Items */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h2 className="text-base">Productos</h2>
              <span className="text-xs text-ink-500">
                {order.items.reduce((a, i) => a + i.quantity, 0)} unidades
              </span>
            </div>
            <ul className="divide-y divide-ink-100">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                  <img src={mediaUrl(it.imagePath, "thumb")} alt="" className="size-14 shrink-0 rounded-lg bg-ink-50 object-contain" />
                  <div className="min-w-0 flex-1">
                    {it.product ? (
                      <Link href={`/admin/productos/${it.product.id}?pedido=${order.id}${sp.volver ? `&volver=${encodeURIComponent(String(sp.volver))}` : ""}`} className="line-clamp-2 text-sm font-semibold hover:underline">
                        {it.name}
                      </Link>
                    ) : (
                      <div className="line-clamp-2 text-sm font-semibold">{it.name}</div>
                    )}
                    <div className="text-xs text-ink-500">
                      {it.quantity} × {formatCLP(it.price)}
                      {it.product ? ` · stock actual ${it.product.stock}` : " · producto no vinculado"}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">{formatCLP(it.total)}</div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-ink-100 px-4 py-3 text-sm">
              <div className="flex justify-between text-ink-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatCLP(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-ink-600">
                  <dt>Descuento</dt>
                  <dd className="tabular-nums">−{formatCLP(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-600">
                <dt>Envío</dt>
                <dd className="tabular-nums">{order.shippingCost > 0 ? formatCLP(order.shippingCost) : order.shippingMethod === "DELIVERY_COD" ? "Por pagar" : "—"}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-black">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCLP(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Cliente y entrega */}
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="card p-4">
              <h2 className="mb-2 text-base">Cliente</h2>
              <div className="text-sm font-semibold">
                {order.firstName} {order.lastName ?? ""}
              </div>
              <dl className="mt-1 space-y-1 text-sm text-ink-600">
                {order.rut && <dd>RUT {formatRut(order.rut)}</dd>}
                {order.email && (
                  <dd>
                    <a href={`mailto:${order.email}`} className="hover:underline">
                      {order.email}
                    </a>
                  </dd>
                )}
                {order.phone && <dd>{order.phone}</dd>}
                {!order.email && !order.phone && <dd className="text-ink-400">Sin datos de contacto</dd>}
              </dl>
              {order.phone && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={`tel:${order.phone}`} className="btn-outline btn-sm">
                    <Phone className="size-4" /> Llamar
                  </a>
                  {waCliente ? (
                    <a href={waCliente} target="_blank" rel="noreferrer" className="btn-outline btn-sm border-[#25D366] text-[#128C4A] hover:bg-[#25D366]/10">
                      <WhatsAppIcon className="size-4" /> WhatsApp
                    </a>
                  ) : (
                    <span className="btn-outline btn-sm pointer-events-none opacity-40" title="El número no sirve para WhatsApp">
                      <WhatsAppIcon className="size-4" /> WhatsApp
                    </span>
                  )}
                </div>
              )}
              {order.user && (
                <Link href={`/admin/clientes/${order.user.id}?pedido=${order.id}${sp.volver ? `&volver=${encodeURIComponent(String(sp.volver))}` : ""}`} className="mt-3 inline-block text-xs font-semibold text-ink-500 hover:text-ink">
                  Ver ficha del cliente →
                </Link>
              )}
            </section>
            <section className="card p-4">
              <h2 className="mb-2 text-base">Entrega</h2>
              <div className="text-sm font-semibold">{SHIPPING_METHOD[order.shippingMethod]}</div>
              {address ? <p className="mt-1 text-sm text-ink-600">{address}</p> : <p className="mt-1 text-sm text-ink-400">Sin dirección</p>}
              {(order.carrier || order.trackingCode) && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Truck className="size-4 text-ink-500" />
                  <span className="font-semibold">{order.carrier ?? "Courier"}</span>
                  {order.trackingCode && <span className="font-mono text-ink-700">{order.trackingCode}</span>}
                  {order.shippedAt && <span className="text-xs text-ink-500">· {formatDateTime(order.shippedAt)}</span>}
                </p>
              )}
              {order.customerNote && (
                <div className="mt-3 rounded-xl bg-lime-50 p-3 text-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-lime-700">Nota del cliente</div>
                  <p className="mt-0.5 whitespace-pre-line">{order.customerNote}</p>
                </div>
              )}
            </section>
          </div>

          {/* Pagos */}
          <section className="card p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base">Pago</h2>
              <div className="flex items-center gap-2">
                <PaymentStatusBadge status={order.paymentStatus} />
                <ChannelBadge channel={order.channel} />
              </div>
            </div>
            <div className="text-sm">
              <span className="font-semibold">{PAYMENT_METHOD[order.paymentMethod]}</span>
              {order.paidAt && <span className="text-ink-500"> · pagado el {formatDateTime(order.paidAt)}</span>}
            </div>
            {order.payments.length > 0 && (
              <ul className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100">
                {order.payments.map((p) => {
                  const entries = rawEntries(p.raw);
                  return (
                    <li key={p.id} className="p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">
                          {PAYMENT_METHOD[p.provider]} · {p.status}
                        </span>
                        <span className="tabular-nums">{formatCLP(p.amount)}</span>
                      </div>
                      <div className="text-xs text-ink-500">
                        {formatDateTime(p.createdAt)}
                        {p.token ? ` · token ${p.token.slice(0, 12)}…` : ""}
                        {p.flowOrder ? ` · Flow #${p.flowOrder}` : ""}
                      </div>
                      {entries.length > 0 && (
                        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
                          {entries.map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2 border-b border-dashed border-ink-100 py-0.5">
                              <dt className="text-ink-500">{k}</dt>
                              <dd className="truncate text-right font-medium">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {isLegacy && <p className="mt-3 text-xs text-ink-400">Pedido migrado desde WooCommerce. Los datos de pago se muestran tal como quedaron registrados en el sitio anterior.</p>}
          </section>

          {order.adminNote && (
            <section className="hidden print:block">
              <h2 className="text-base">Nota interna</h2>
              <p className="whitespace-pre-line text-sm">{order.adminNote}</p>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <OrderActions key={`${order.status}-${order.paymentStatus}`} order={{ id: order.id, number: order.number, status: order.status, paymentStatus: order.paymentStatus, firstName: order.firstName, phone: order.phone, email: order.email, total: order.total, adminNote: order.adminNote, carrier: order.carrier, trackingCode: order.trackingCode }} />
          {order.shippingMethod !== "NONE" && (
            <ShippingForm key={`ship-${order.status}-${order.carrier}-${order.trackingCode}`} order={{ id: order.id, status: order.status, carrier: order.carrier, trackingCode: order.trackingCode, shippedAt: order.shippedAt, email: order.email }} />
          )}
          <section className="card p-4 text-xs text-ink-500 print:hidden">
            <div>ID interno: {order.id}</div>
            <div>Actualizado: {formatDateTime(order.updatedAt)}</div>
            <Link href={`/pedido/${order.id}`} target="_blank" className="mt-2 inline-block font-semibold text-ink-700 hover:underline">
              Ver como cliente →
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
