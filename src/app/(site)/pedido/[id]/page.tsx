import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, CreditCard, ExternalLink, Landmark, MapPin, Package, RefreshCw, Truck, User, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { Confetti } from "@/components/checkout/Confetti";
import { OrderEmailGate } from "@/components/order/OrderEmailGate";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { getCurrentUser } from "@/lib/auth";
import { regionName } from "@/lib/chile";
import { OrderStatus, PaymentMethod, PaymentStatus, ShippingMethod } from "@/lib/db";
import { flowConfigured } from "@/lib/flow";
import { formatCLP, formatDateTime } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { canViewOrder } from "@/lib/order-access";
import { ORDER_STATUS, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { getOrderById, getStoreSettings } from "@/lib/orders";
import { trackingUrl } from "@/lib/shipping";
import { SITE, whatsappLink } from "@/lib/site";
import { retryFlowPayment } from "./actions";
import { PurchaseEvent } from "@/components/analytics/PurchaseEvent";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ pago?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, { pago }, user, store] = await Promise.all([params, searchParams, getCurrentUser(), getStoreSettings()]);
  const order = await getOrderById(id);
  if (!order) notFound();

  const status = ORDER_STATUS[order.status];
  const canView = await canViewOrder(order, user);
  if (!canView) {
    return (
      <div className="bg-ink-50/60">
        <div className="container-x py-8 md:py-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-ink text-lime">
              <Package className="size-8" />
            </span>
            <span className="eyebrow mt-5 block">Pedido #{order.number}</span>
            <h1 className="mt-2 text-3xl sm:text-4xl">Estado de tu pedido</h1>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Badge tone={status.tone}>{status.label}</Badge>
              <span className="text-[13px] text-ink-500">{status.help}</span>
            </div>
            <div className="card mt-6 p-5 sm:p-6">
              <OrderTimeline status={order.status} shippingMethod={order.shippingMethod} />
            </div>
          </div>
          <div className="mx-auto mt-6 max-w-2xl">
            {order.email ? (
              <OrderEmailGate orderId={order.id} />
            ) : (
              <div className="card mx-auto max-w-md p-5 text-center sm:p-6">
                <h2 className="text-lg">¿Dudas con este pedido?</h2>
                <p className="mt-1 text-[13px] text-ink-500">Este pedido se registró sin email. Escríbenos por WhatsApp y te contamos el detalle.</p>
                <a href={whatsappLink(`Hola, tengo una consulta sobre el pedido #${order.number}`)} target="_blank" rel="noreferrer" className="btn-primary btn-md mt-4 w-full">
                  <WhatsAppIcon className="size-4" /> Consultar por WhatsApp
                </a>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-ink-400">
              {user ? (
                "¿Es tu pedido? Verifica el email con que compraste."
              ) : (
                <>
                  ¿Compraste con tu cuenta?{" "}
                  <Link href={`/cuenta/ingresar?next=${encodeURIComponent(`/pedido/${order.id}`)}`} className="font-semibold text-ink underline underline-offset-2">
                    Inicia sesión
                  </Link>{" "}
                  para ver el detalle.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === PaymentStatus.PAID;
  const isCancelled = order.status === OrderStatus.CANCELLED;
  const isTransfer = order.paymentMethod === PaymentMethod.TRANSFER;
  const isFlow = order.paymentMethod === PaymentMethod.FLOW;
  const isDelivery = order.shippingMethod === ShippingMethod.DELIVERY_COD;
  const awaitingTransfer = isTransfer && !isPaid && !isCancelled;
  const canRetryFlow = isFlow && order.status === OrderStatus.PENDING && !isPaid && flowConfigured();
  const track = trackingUrl(order.carrier, order.trackingCode);
  const shipped = Boolean(order.shippedAt || order.trackingCode || order.carrier);

  const hero = heroCopy({ pago, isPaid, isCancelled, awaitingTransfer, isFlow, firstName: order.firstName });

  return (
    <div className="relative bg-ink-50/60">
      {hero.confetti ? <Confetti /> : null}
      {/* Evento de compra para Meta/GA (solo si hay píxel configurado; se registra una vez por pedido) */}
      <PurchaseEvent orderId={order.id} number={order.number} total={order.total} items={order.items} enabled={isPaid || awaitingTransfer} />
      <div className="container-x relative py-8 md:py-12">
        {/* Encabezado */}
        <div className="mx-auto max-w-2xl text-center">
          <span className={`mx-auto flex size-16 items-center justify-center rounded-full ${hero.tone === "ok" ? "bg-lime text-ink" : hero.tone === "bad" ? "bg-danger/10 text-danger" : "bg-flame/15 text-[#9a5a0a]"}`}>
            {hero.tone === "ok" ? <CheckCircle2 className="size-8" /> : hero.tone === "bad" ? <XCircle className="size-8" /> : <Clock className="size-8" />}
          </span>
          <span className="eyebrow mt-5 block">
            Pedido #{order.number} · {formatDateTime(order.createdAt)}
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl">{hero.title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-ink-500">{hero.text}</p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="text-[13px] text-ink-500">{status.help}</span>
          </div>
          <div className="card mt-6 p-5 sm:p-6">
            <OrderTimeline status={order.status} shippingMethod={order.shippingMethod} />
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {/* Transferencia */}
            {awaitingTransfer ? (
              <section className="card overflow-hidden border-2 border-lime" aria-labelledby="transfer-title">
                <div className="flex items-center gap-3 bg-lime-50 px-5 py-4 sm:px-6">
                  <span className="flex size-10 items-center justify-center rounded-full bg-lime text-ink">
                    <Landmark className="size-5" />
                  </span>
                  <div>
                    <h2 id="transfer-title" className="text-lg leading-tight">
                      Datos para transferir
                    </h2>
                    <p className="text-[13px] text-ink-500">Tu pedido queda reservado. Lo confirmamos apenas recibamos el pago.</p>
                  </div>
                </div>
                <div className="grid gap-5 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-6">
                  <pre className="whitespace-pre-line font-sans text-[15px] leading-relaxed text-ink">{store.transferDetails || "Escríbenos por WhatsApp y te enviamos los datos de transferencia."}</pre>
                  <div className="rounded-2xl bg-ink px-5 py-4 text-white sm:min-w-52">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-300">Monto exacto</div>
                    <div className="mt-1 text-2xl font-extrabold tabular-nums text-lime">{formatCLP(order.total)}</div>
                    <div className="mt-2 text-[12px] text-ink-300">
                      Referencia: <span className="font-bold text-white">Pedido #{order.number}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-[13px] text-ink-500">Envíanos el comprobante y confirmamos tu pedido a la brevedad.</p>
                  <a href={whatsappLink(`Hola, envío comprobante del pedido #${order.number}`)} target="_blank" rel="noreferrer" className="btn-primary btn-md shrink-0">
                    <WhatsAppIcon className="size-4" /> Enviar comprobante por WhatsApp
                  </a>
                </div>
              </section>
            ) : null}

            {/* Flow pendiente */}
            {canRetryFlow ? (
              <section className="card flex flex-col gap-4 border-2 border-flame/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-labelledby="retry-title">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-flame/15 text-[#9a5a0a]">
                    <CreditCard className="size-5" />
                  </span>
                  <div>
                    <h2 id="retry-title" className="text-lg leading-tight">
                      Tu pago aún no se confirma
                    </h2>
                    <p className="mt-1 text-[13px] text-ink-500">Si no completaste el pago en Flow, puedes intentarlo de nuevo. Tu pedido sigue reservado.</p>
                  </div>
                </div>
                <form action={retryFlowPayment} className="shrink-0">
                  <input type="hidden" name="orderId" value={order.id} />
                  <button type="submit" className="btn-lime btn-md w-full sm:w-auto">
                    <RefreshCw className="size-4" /> Reintentar pago
                  </button>
                </form>
              </section>
            ) : null}

            {/* Envío / seguimiento */}
            {shipped && !isCancelled ? (
              <section className="card overflow-hidden border-2 border-ink" aria-labelledby="tracking-title">
                <div className="flex items-center gap-3 bg-ink px-5 py-4 text-white sm:px-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
                    {isDelivery ? <Truck className="size-5" /> : <Package className="size-5" />}
                  </span>
                  <div>
                    <h2 id="tracking-title" className="text-lg leading-tight text-white">
                      {isDelivery ? "Tu pedido va en camino" : "Tu pedido está listo para retiro"}
                    </h2>
                    {order.shippedAt ? <p className="text-[13px] text-ink-300">{isDelivery ? "Despachado" : "Listo"} el {formatDateTime(order.shippedAt)}</p> : null}
                  </div>
                </div>
                {isDelivery ? (
                  <div className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Courier</dt>
                        <dd className="mt-0.5 font-semibold">{order.carrier || "Por confirmar"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Código de seguimiento</dt>
                        <dd className="mt-0.5 font-mono text-[15px] font-semibold tracking-wide">{order.trackingCode || "Te lo enviaremos pronto"}</dd>
                      </div>
                    </dl>
                    {track ? (
                      <a href={track} target="_blank" rel="noreferrer" className="btn-lime btn-md w-full sm:w-auto">
                        Seguir envío <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Items */}
            <section className="card p-5 sm:p-6" aria-labelledby="items-title">
              <h2 id="items-title" className="text-lg">
                Detalle del pedido
              </h2>
              <ul className="mt-3 divide-y divide-ink-100">
                {order.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-4 py-3">
                    <img src={mediaUrl(it.imagePath, "thumb")} alt="" className="size-16 shrink-0 rounded-xl bg-ink-50 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold leading-snug">{it.name}</div>
                      <div className="mt-0.5 text-[13px] text-ink-500">
                        {it.quantity} × {formatCLP(it.price)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-bold tabular-nums">{formatCLP(it.total)}</div>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-2 border-t border-ink-100 pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Subtotal</dt>
                  <dd className="font-semibold tabular-nums">{formatCLP(order.subtotal)}</dd>
                </div>
                {order.discount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Descuento</dt>
                    <dd className="font-semibold tabular-nums text-lime-700">−{formatCLP(order.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-ink-500">Envío</dt>
                  <dd className="font-semibold">{order.shippingCost > 0 ? formatCLP(order.shippingCost) : isDelivery ? "Por pagar al courier" : "Retiro gratis"}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                  <dt className="text-base font-bold">Total</dt>
                  <dd className="text-2xl font-extrabold tabular-nums">{formatCLP(order.total)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="card p-5" aria-labelledby="delivery-title">
              <h2 id="delivery-title" className="flex items-center gap-2 text-base">
                {isDelivery ? <Truck className="size-4 text-lime-700" /> : <Package className="size-4 text-lime-700" />} Entrega
              </h2>
              {isDelivery ? (
                <div className="mt-2 text-sm leading-relaxed text-ink-700">
                  <div className="font-semibold">Envío por pagar</div>
                  <div className="mt-1 flex items-start gap-1.5 text-ink-500">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {order.address1}
                      {order.address2 ? `, ${order.address2}` : ""}
                      <br />
                      {order.commune}
                      {order.region ? `, ${regionName(order.region)}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ink-400">{store.shippingNote}</p>
                </div>
              ) : (
                <div className="mt-2 text-sm leading-relaxed text-ink-700">
                  <div className="font-semibold">Retiro (gratis)</div>
                  <p className="mt-1 text-ink-500">{store.pickupAddress}</p>
                </div>
              )}
              {order.customerNote ? (
                <p className="mt-3 rounded-xl bg-ink-50 px-3 py-2 text-[13px] text-ink-700">
                  <span className="font-semibold">Nota:</span> {order.customerNote}
                </p>
              ) : null}
            </section>

            <section className="card p-5" aria-labelledby="customer-title">
              <h2 id="customer-title" className="flex items-center gap-2 text-base">
                <User className="size-4 text-lime-700" /> Cliente
              </h2>
              <div className="mt-2 text-sm leading-relaxed text-ink-700">
                <div className="font-semibold">
                  {order.firstName} {order.lastName}
                </div>
                <div className="text-ink-500">{order.email}</div>
                <div className="text-ink-500">{order.phone}</div>
                {order.rut ? <div className="text-ink-500">RUT {order.rut}</div> : null}
              </div>
            </section>

            <section className="card p-5" aria-labelledby="payment-title">
              <h2 id="payment-title" className="flex items-center gap-2 text-base">
                <CreditCard className="size-4 text-lime-700" /> Pago
              </h2>
              <div className="mt-2 text-sm text-ink-700">
                <div className="font-semibold">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={isPaid ? "success" : isCancelled ? "danger" : "warn"}>{isPaid ? "Pagado" : isCancelled ? "No pagado" : "Pendiente"}</Badge>
                  {order.paidAt ? <span className="text-[12px] text-ink-400">{formatDateTime(order.paidAt)}</span> : null}
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-2">
              <Link href="/tienda" className="btn-primary btn-md w-full">
                Seguir comprando <ArrowRight className="size-4" />
              </Link>
              {user ? (
                <Link href="/cuenta" className="btn-outline btn-md w-full">
                  Ver mis pedidos
                </Link>
              ) : (
                <p className="text-center text-xs text-ink-400">
                  Guarda este enlace para revisar el estado de tu pedido. ¿Dudas?{" "}
                  <a href={whatsappLink(`Hola, tengo una consulta sobre el pedido #${order.number}`)} target="_blank" rel="noreferrer" className="font-semibold text-ink underline underline-offset-2">
                    Escríbenos por WhatsApp
                  </a>{" "}
                  o a {SITE.email}.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function heroCopy({ pago, isPaid, isCancelled, awaitingTransfer, isFlow, firstName }: { pago?: string; isPaid: boolean; isCancelled: boolean; awaitingTransfer: boolean; isFlow: boolean; firstName: string }) {
  if (isPaid) {
    return {
      tone: "ok" as const,
      confetti: pago === "ok",
      title: pago === "ok" ? `¡Gracias por tu compra, ${firstName}!` : "Pedido pagado",
      text: "Tu pago está confirmado y ya estamos preparando tu pedido. Te enviamos un correo con el detalle.",
    };
  }
  if (isCancelled) {
    return {
      tone: "bad" as const,
      confetti: false,
      title: pago === "rechazado" ? "El pago fue rechazado" : "Pedido cancelado",
      text: pago === "rechazado" ? "Flow no pudo procesar el pago y el pedido fue cancelado. Los productos volvieron a estar disponibles: puedes volver a intentarlo desde el carrito." : "Este pedido fue cancelado. Si crees que es un error, escríbenos por WhatsApp.",
    };
  }
  if (awaitingTransfer) {
    return {
      tone: "ok" as const,
      confetti: false,
      title: `¡Recibimos tu pedido, ${firstName}!`,
      text: "Solo falta el pago. Transfiere el monto exacto con los datos de abajo y envíanos el comprobante para confirmarlo.",
    };
  }
  if (isFlow) {
    return {
      tone: "wait" as const,
      confetti: false,
      title: pago === "error" ? "No pudimos iniciar el pago" : "Tu pago está pendiente",
      text: pago === "error" ? "Hubo un problema al conectar con Flow. Inténtalo de nuevo en unos segundos." : "Aún no recibimos la confirmación de Flow. Si ya pagaste, se actualizará en unos minutos; si no, puedes reintentar.",
    };
  }
  return { tone: "wait" as const, confetti: false, title: "Tu pedido", text: "Aquí puedes revisar el estado de tu pedido." };
}
