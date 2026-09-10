import "server-only";
import { after } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db, OrderChannel, OrderStatus, PaymentMethod, PaymentStatus, ProductStatus, ShippingMethod } from "@/lib/db";
import { formatCLP, formatDateTime, formatRut, validateRut } from "@/lib/format";
import { REGION_BY_CODE, regionName } from "@/lib/chile";
import { sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";
import { mediaUrl } from "@/lib/media-url";
import { getFlowStatus, type FlowStatus } from "@/lib/flow";
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, SHIPPING_METHOD_LABEL } from "@/lib/order-status";
import { trackingUrl } from "@/lib/shipping";

/* ------------------------------------------------------------------ */
/* Ajustes de la tienda (Setting "store")                              */
/* ------------------------------------------------------------------ */

export type StoreSettings = {
  pickupAddress: string;
  shippingNote: string;
  transferEnabled: boolean;
  transferDetails: string;
};

const STORE_DEFAULTS: StoreSettings = {
  pickupAddress: "Metro El Llano o dirección comercial.",
  shippingNote: "Envío por pagar: el costo lo pagas al courier al recibir tu pedido. Despachamos en 24 a 48 horas y la entrega demora de 1 a 3 días.",
  transferEnabled: true,
  transferDetails: "",
};

export async function getStoreSettings(): Promise<StoreSettings> {
  const row = await db.setting.findUnique({ where: { key: "store" } });
  const v = (row?.value ?? {}) as Partial<StoreSettings>;
  return {
    pickupAddress: typeof v.pickupAddress === "string" ? v.pickupAddress : STORE_DEFAULTS.pickupAddress,
    shippingNote: typeof v.shippingNote === "string" ? v.shippingNote : STORE_DEFAULTS.shippingNote,
    transferEnabled: typeof v.transferEnabled === "boolean" ? v.transferEnabled : STORE_DEFAULTS.transferEnabled,
    transferDetails: typeof v.transferDetails === "string" ? v.transferDetails : STORE_DEFAULTS.transferDetails,
  };
}

/* ------------------------------------------------------------------ */
/* Validación del checkout                                             */
/* ------------------------------------------------------------------ */

const trimmed = (max: number) => z.string().trim().max(max);

export const checkoutSchema = z
  .object({
    firstName: z.string().trim().min(2, "Ingresa tu nombre").max(80, "Nombre demasiado largo"),
    lastName: z.string().trim().min(2, "Ingresa tu apellido").max(80, "Apellido demasiado largo"),
    email: z.string().trim().toLowerCase().pipe(z.email("Ingresa un email válido")),
    phone: z
      .string()
      .trim()
      .min(8, "Ingresa un teléfono válido")
      .max(20, "Teléfono demasiado largo")
      .regex(/^[+\d\s()-]+$/, "Ingresa un teléfono válido"),
    rut: z
      .string()
      .trim()
      .min(1, "Ingresa tu RUT")
      .refine(validateRut, "El RUT no es válido")
      .transform(formatRut),
    shippingMethod: z.enum(["DELIVERY_COD", "PICKUP"], { error: "Elige cómo quieres recibir tu pedido" }),
    address1: trimmed(200).optional().default(""),
    address2: trimmed(120).optional().default(""),
    commune: trimmed(80).optional().default(""),
    region: trimmed(10).optional().default(""),
    customerNote: trimmed(600).optional().default(""),
    paymentMethod: z.enum(["FLOW", "TRANSFER"], { error: "Elige un medio de pago" }),
    acceptTerms: z.boolean().refine((v) => v === true, "Debes aceptar los términos y condiciones"),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          qty: z.number().int().min(1).max(99),
          name: z.string().optional(),
        }),
      )
      .min(1, "Tu carrito está vacío"),
  })
  .superRefine((data, ctx) => {
    if (data.shippingMethod === "DELIVERY_COD") {
      if (!data.region || !REGION_BY_CODE[data.region]) ctx.addIssue({ code: "custom", path: ["region"], message: "Elige tu región" });
      if (!data.commune) ctx.addIssue({ code: "custom", path: ["commune"], message: "Ingresa tu comuna" });
      if (data.address1.length < 5) ctx.addIssue({ code: "custom", path: ["address1"], message: "Ingresa la dirección de entrega" });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

/* ------------------------------------------------------------------ */
/* Errores                                                             */
/* ------------------------------------------------------------------ */

export class OrderError extends Error {
  code: "VALIDATION" | "STOCK" | "STATE";
  field?: string;
  details?: string[];
  constructor(code: OrderError["code"], message: string, opts: { field?: string; details?: string[] } = {}) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.field = opts.field;
    this.details = opts.details;
  }
}

/* ------------------------------------------------------------------ */
/* Crear pedido                                                        */
/* ------------------------------------------------------------------ */

export const orderInclude = {
  items: { orderBy: { id: "asc" } },
  payments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/**
 * Valida los datos del cliente, revalida cada item en BD (producto ACTIVE, precio actual, stock)
 * dentro de una transacción, descuenta el stock y crea el pedido.
 * Lanza OrderError con mensajes claros para mostrar al cliente.
 */
export async function createOrderFromCart(input: unknown, opts: { userId?: string | null } = {}): Promise<OrderWithItems> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new OrderError("VALIDATION", issue?.message ?? "Revisa los datos del formulario", { field: issue?.path?.[0]?.toString() });
  }
  const data = parsed.data;

  // Agrupa cantidades por producto por si el carrito trae duplicados.
  const wanted = new Map<string, { qty: number; name?: string }>();
  for (const it of data.items) {
    const prev = wanted.get(it.productId);
    wanted.set(it.productId, { qty: (prev?.qty ?? 0) + it.qty, name: it.name ?? prev?.name });
  }

  const order = await db.$transaction(async (tx) => {
    const ids = [...wanted.keys()];
    const products = await tx.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        status: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { path: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const problems: string[] = [];
    for (const [id, w] of wanted) {
      const p = byId.get(id);
      if (!p || p.status !== ProductStatus.ACTIVE) {
        problems.push(`${p?.name ?? w.name ?? "Un producto"} ya no está disponible`);
      } else if (p.stock < w.qty) {
        problems.push(p.stock <= 0 ? `${p.name} está agotado` : `${p.name}: solo ${p.stock === 1 ? "queda 1 unidad" : `quedan ${p.stock} unidades`} (pediste ${w.qty})`);
      }
    }
    if (problems.length) {
      throw new OrderError("STOCK", "Algunos productos cambiaron de disponibilidad. Ajusta tu carrito para continuar.", { details: problems });
    }

    // Descuento condicional (protege contra compras simultáneas).
    for (const [id, w] of wanted) {
      const r = await tx.product.updateMany({
        where: { id, status: ProductStatus.ACTIVE, stock: { gte: w.qty } },
        data: { stock: { decrement: w.qty }, totalSales: { increment: w.qty } },
      });
      if (r.count !== 1) {
        throw new OrderError("STOCK", "Algunos productos cambiaron de disponibilidad. Ajusta tu carrito para continuar.", {
          details: [`${byId.get(id)?.name ?? w.name ?? "Un producto"}: no hay stock suficiente`],
        });
      }
    }

    const items = ids.map((id) => {
      const p = byId.get(id)!;
      const w = wanted.get(id)!;
      return { productId: id, name: p.name, price: p.price, quantity: w.qty, total: p.price * w.qty, imagePath: p.images[0]?.path ?? null };
    });
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const shippingCost = 0; // envío por pagar al courier / retiro gratis
    const isDelivery = data.shippingMethod === "DELIVERY_COD";

    return tx.order.create({
      data: {
        userId: opts.userId ?? null,
        channel: OrderChannel.WEB,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: data.paymentMethod === "FLOW" ? PaymentMethod.FLOW : PaymentMethod.TRANSFER,
        subtotal,
        shippingCost,
        discount: 0,
        total: subtotal + shippingCost,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        rut: data.rut,
        shippingMethod: isDelivery ? ShippingMethod.DELIVERY_COD : ShippingMethod.PICKUP,
        address1: isDelivery ? data.address1 : null,
        address2: isDelivery && data.address2 ? data.address2 : null,
        commune: isDelivery ? data.commune : null,
        city: isDelivery ? data.commune : null,
        region: isDelivery ? data.region : null,
        customerNote: data.customerNote || null,
        items: { create: items },
      },
      include: orderInclude,
    });
  });

  return order;
}

/* ------------------------------------------------------------------ */
/* Cambios de estado                                                   */
/* ------------------------------------------------------------------ */

/**
 * Marca el pedido como pagado. Idempotente: si ya estaba pagado no cambia nada
 * y devuelve `changed: false`.
 */
export async function markOrderPaid(
  orderId: string,
  payment: { paymentId?: string; token?: string; flowOrder?: number | null; raw?: unknown; paidAt?: Date } = {},
): Promise<{ order: OrderWithItems; changed: boolean }> {
  return db.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!current) throw new OrderError("STATE", "Pedido no encontrado");
    const already = current.paymentStatus === PaymentStatus.PAID;
    const paidAt = payment.paidAt ?? new Date();

    if (payment.paymentId || payment.token) {
      await tx.payment.updateMany({
        where: payment.paymentId ? { id: payment.paymentId } : { token: payment.token },
        data: {
          status: "paid",
          ...(payment.flowOrder != null ? { flowOrder: payment.flowOrder } : {}),
          ...(payment.raw !== undefined ? { raw: payment.raw as Prisma.InputJsonValue } : {}),
        },
      });
    }
    if (already) return { order: current, changed: false };

    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidAt,
        // Solo avanzamos el estado si aún estaba esperando pago (un pedido cancelado ya devolvió stock).
        ...(current.status === OrderStatus.PENDING ? { status: OrderStatus.PAID } : {}),
      },
      include: orderInclude,
    });
    return { order, changed: true };
  });
}

/** Cancela el pedido y devuelve el stock si estaba PENDING. Idempotente. */
export async function cancelOrderAndRestock(orderId: string): Promise<{ order: OrderWithItems; changed: boolean }> {
  return db.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!current) throw new OrderError("STATE", "Pedido no encontrado");
    if (current.status !== OrderStatus.PENDING) return { order: current, changed: false };

    for (const it of current.items) {
      if (!it.productId) continue;
      await tx.product.updateMany({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity }, totalSales: { decrement: it.quantity } },
      });
    }
    const order = await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED }, include: orderInclude });
    return { order, changed: true };
  });
}

/* ------------------------------------------------------------------ */
/* Flow: sincronizar estado de un pago por token                       */
/* ------------------------------------------------------------------ */

export type FlowSyncResult = { orderId: string | null; outcome: "paid" | "rejected" | "pending" | "unknown" };

/**
 * Consulta el estado del pago en Flow y actualiza pedido + Payment.
 * Se usa tanto en el webhook (confirm) como en el retorno del cliente (return).
 * Idempotente: procesar dos veces el mismo token no duplica correos ni stock.
 */
export async function syncFlowPayment(token: string): Promise<FlowSyncResult> {
  const payment = await db.payment.findUnique({ where: { token }, select: { id: true, orderId: true, status: true, amount: true } });
  if (!payment) return { orderId: null, outcome: "unknown" };
  if (payment.status === "paid") return { orderId: payment.orderId, outcome: "paid" };
  if (payment.status === "rejected" || payment.status === "cancelled") return { orderId: payment.orderId, outcome: "rejected" };

  let status: FlowStatus;
  try {
    status = await getFlowStatus(token);
  } catch (err) {
    console.error("[flow] error consultando estado", err);
    return { orderId: payment.orderId, outcome: "pending" };
  }

  if (status.status === 2) {
    // Defensa extra: el monto informado por Flow debe coincidir con el del intento de pago.
    if (Math.round(Number(status.amount)) !== payment.amount) {
      console.error(`[flow] monto no coincide: Flow ${status.amount} vs pedido ${payment.amount} (token ${token.slice(0, 8)}…)`);
      await db.payment.update({ where: { id: payment.id }, data: { status: "mismatch", flowOrder: status.flowOrder, raw: status as unknown as Prisma.InputJsonValue } });
      return { orderId: payment.orderId, outcome: "pending" };
    }
    const { changed } = await markOrderPaid(payment.orderId, {
      paymentId: payment.id,
      flowOrder: status.flowOrder,
      raw: status,
      paidAt: status.paymentData?.date ? new Date(status.paymentData.date) : undefined,
    });
    // Se envían después de responder: Flow y el cliente no deben esperar al servidor de correo
    if (changed) after(() => sendOrderEmails(payment.orderId));
    return { orderId: payment.orderId, outcome: "paid" };
  }

  if (status.status === 3 || status.status === 4) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: status.status === 3 ? "rejected" : "cancelled", flowOrder: status.flowOrder, raw: status as unknown as Prisma.InputJsonValue },
    });
    await cancelOrderAndRestock(payment.orderId);
    return { orderId: payment.orderId, outcome: "rejected" };
  }

  await db.payment.update({ where: { id: payment.id }, data: { flowOrder: status.flowOrder, raw: status as unknown as Prisma.InputJsonValue } });
  return { orderId: payment.orderId, outcome: "pending" };
}

/* ------------------------------------------------------------------ */
/* Correos                                                             */
/* ------------------------------------------------------------------ */

export function esc(s: string | null | undefined) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plantilla base de los correos de la tienda (cabecera negra con logo, tarjeta blanca, pie legal).
 * `bodyHtml` va dentro de la tarjeta; usar `emailButton()` para el botón principal.
 */
export function emailShell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f5f5f5;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:22px 28px;" align="center">
          <img src="${SITE.url}/brand/logo.png" alt="${esc(SITE.name)}" width="180" style="display:block;max-width:180px;height:auto;">
        </td></tr>
        <tr><td style="padding:28px 28px 30px;">${bodyHtml}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#a3a3a3;">${esc(SITE.legalName)} · ${esc(SITE.url)}</p>
    </td></tr>
  </table>
</body></html>`;
}

export function emailButton(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#b0d800;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;">${esc(label)}</a>`;
}

const EMAIL_EYEBROW = "font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#7a9600;";
const EMAIL_HELP = `¿Dudas? Escríbenos por WhatsApp al ${esc(SITE.phone)} o a ${esc(SITE.email)}.`;

export function orderEmailHtml(order: OrderWithItems, store: StoreSettings, opts: { forStore: boolean }) {
  const url = `${SITE.url}/pedido/${order.id}`;
  const isPaid = order.paymentStatus === PaymentStatus.PAID;
  const isTransfer = order.paymentMethod === PaymentMethod.TRANSFER;
  const isDelivery = order.shippingMethod === ShippingMethod.DELIVERY_COD;
  const status = ORDER_STATUS[order.status];

  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #ececec;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;"><img src="${SITE.url}${mediaUrl(it.imagePath, "thumb")}" width="56" height="56" alt="" style="display:block;border-radius:10px;background:#f5f5f5;object-fit:cover;"></td>
            <td style="font-size:14px;color:#0a0a0a;line-height:1.35;"><strong>${esc(it.name)}</strong><br><span style="color:#737373;font-size:13px;">${it.quantity} × ${formatCLP(it.price)}</span></td>
          </tr></table>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #ececec;font-size:14px;font-weight:700;white-space:nowrap;">${formatCLP(it.total)}</td>
      </tr>`,
    )
    .join("");

  const title = opts.forStore
    ? `Nuevo pedido #${order.number}`
    : isPaid
      ? `¡Pago confirmado! Pedido #${order.number}`
      : isTransfer
        ? `Recibimos tu pedido #${order.number}`
        : `Tu pedido #${order.number}`;

  const intro = opts.forStore
    ? `${esc(order.firstName)} ${esc(order.lastName)} hizo un pedido por <strong>${formatCLP(order.total)}</strong> · ${esc(PAYMENT_METHOD_LABEL[order.paymentMethod])} · ${esc(SHIPPING_METHOD_LABEL[order.shippingMethod])}.`
    : isPaid
      ? `Hola ${esc(order.firstName)}, tu pago fue confirmado. Ya estamos preparando tu pedido.`
      : isTransfer
        ? `Hola ${esc(order.firstName)}, recibimos tu pedido. Para confirmarlo, haz la transferencia por el monto exacto y envíanos el comprobante.`
        : `Hola ${esc(order.firstName)}, aquí está el detalle de tu pedido.`;

  const transferBlock =
    !opts.forStore && isTransfer && !isPaid
      ? `
      <div style="margin:20px 0;padding:16px 18px;border-radius:14px;background:#f8fce0;border:1px solid #b0d800;">
        <div style="${EMAIL_EYEBROW}">Datos para transferir</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.6;white-space:pre-line;">${esc(store.transferDetails)}</div>
        <div style="margin-top:10px;font-size:14px;">Monto exacto: <strong>${formatCLP(order.total)}</strong> · Referencia: <strong>Pedido #${order.number}</strong></div>
        <div style="margin-top:6px;font-size:13px;color:#525252;">Envía el comprobante por WhatsApp al ${esc(SITE.phone)} o responde este correo.</div>
      </div>`
      : "";

  const deliveryBlock = isDelivery
    ? `<strong>${esc(SHIPPING_METHOD_LABEL[order.shippingMethod])}</strong><br>${esc(order.address1)}${order.address2 ? `, ${esc(order.address2)}` : ""}<br>${esc(order.commune)}, ${esc(regionName(order.region))}<br><span style="color:#737373;font-size:13px;">${esc(store.shippingNote)}</span>`
    : `<strong>Retiro</strong><br><span style="color:#737373;font-size:13px;">${esc(store.pickupAddress)}</span>`;

  const body = `
          <div style="${EMAIL_EYEBROW}">Pedido #${order.number} · ${esc(formatDateTime(order.createdAt))}</div>
          <h1 style="margin:8px 0 12px;font-size:22px;line-height:1.2;">${esc(title)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.55;color:#262626;">${intro}</p>
          <p style="margin:10px 0 0;font-size:13px;color:#525252;">Estado: <strong>${esc(status.label)}</strong> · Pago: <strong>${esc(PAYMENT_METHOD_LABEL[order.paymentMethod])}</strong></p>
          ${transferBlock}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">${rows}
            <tr><td style="padding:12px 0 4px;font-size:14px;color:#525252;">Subtotal</td><td align="right" style="padding:12px 0 4px;font-size:14px;">${formatCLP(order.subtotal)}</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#525252;">Envío</td><td align="right" style="padding:4px 0;font-size:14px;">${isDelivery ? "Por pagar al courier" : "Retiro gratis"}</td></tr>
            <tr><td style="padding:8px 0 0;font-size:16px;font-weight:700;">Total</td><td align="right" style="padding:8px 0 0;font-size:18px;font-weight:800;">${formatCLP(order.total)}</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
            <td valign="top" width="50%" style="font-size:14px;line-height:1.5;padding-right:8px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin-bottom:6px;">Entrega</div>${deliveryBlock}
            </td>
            <td valign="top" width="50%" style="font-size:14px;line-height:1.5;padding-left:8px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin-bottom:6px;">Cliente</div>
              <strong>${esc(order.firstName)} ${esc(order.lastName)}</strong><br>${esc(order.email)}<br>${esc(order.phone)}<br>${esc(order.rut)}
            </td>
          </tr></table>
          ${order.customerNote ? `<p style="margin:14px 0 0;font-size:13px;color:#525252;"><strong>Nota:</strong> ${esc(order.customerNote)}</p>` : ""}
          <div style="margin-top:26px;text-align:center;">
            ${emailButton(url, opts.forStore ? "Ver pedido" : "Ver el estado de mi pedido")}
            <p style="margin:16px 0 0;font-size:12px;color:#737373;">${opts.forStore ? `Administrar en <a href="${SITE.url}/admin" style="color:#7a9600;">${SITE.url}/admin</a>` : EMAIL_HELP}</p>
          </div>`;

  return emailShell(title, body);
}

export function orderEmailText(order: OrderWithItems, store: StoreSettings) {
  const lines = [
    `Pedido #${order.number} · ${formatDateTime(order.createdAt)}`,
    `Estado: ${ORDER_STATUS[order.status].label} · Pago: ${PAYMENT_METHOD_LABEL[order.paymentMethod]}`,
    "",
    ...order.items.map((it) => `- ${it.name} × ${it.quantity} = ${formatCLP(it.total)}`),
    "",
    `Total: ${formatCLP(order.total)} (envío ${order.shippingMethod === ShippingMethod.DELIVERY_COD ? "por pagar al courier" : "retiro gratis"})`,
  ];
  if (order.paymentMethod === PaymentMethod.TRANSFER && order.paymentStatus !== PaymentStatus.PAID) {
    lines.push("", "Datos para transferir:", store.transferDetails, `Monto exacto: ${formatCLP(order.total)} · Referencia: Pedido #${order.number}`);
  }
  lines.push("", `Ver pedido: ${SITE.url}/pedido/${order.id}`);
  return lines.join("\n");
}

/** Envía confirmación al cliente y aviso a la tienda. Nunca lanza. */
export async function sendOrderEmails(orderOrId: string | OrderWithItems) {
  try {
    const order = typeof orderOrId === "string" ? await db.order.findUnique({ where: { id: orderOrId }, include: orderInclude }) : orderOrId;
    if (!order) return;
    const store = await getStoreSettings();
    const isPaid = order.paymentStatus === PaymentStatus.PAID;
    const text = orderEmailText(order, store);

    const jobs: Promise<unknown>[] = [];
    if (order.email) {
      jobs.push(
        sendMail({
          to: order.email,
          subject: isPaid ? `¡Pago confirmado! Pedido #${order.number} · ${SITE.name}` : `Recibimos tu pedido #${order.number} · ${SITE.name}`,
          html: orderEmailHtml(order, store, { forStore: false }),
          text,
        }),
      );
    }
    jobs.push(
      sendMail({
        to: SITE.email,
        subject: `${isPaid ? "Pedido pagado" : "Nuevo pedido"} #${order.number} · ${order.firstName} ${order.lastName ?? ""} · ${formatCLP(order.total)}`,
        html: orderEmailHtml(order, store, { forStore: true }),
        text,
      }),
    );
    await Promise.all(jobs);
  } catch (err) {
    console.error("[orders] error enviando correos", err);
  }
}

/** Aviso al cliente de que el pedido fue despachado (courier, código y enlace de seguimiento). Nunca lanza. */
export async function sendShippedEmail(orderOrId: string | OrderWithItems) {
  try {
    const order = typeof orderOrId === "string" ? await db.order.findUnique({ where: { id: orderOrId }, include: orderInclude }) : orderOrId;
    if (!order?.email) return;
    const url = `${SITE.url}/pedido/${order.id}`;
    const track = trackingUrl(order.carrier, order.trackingCode);
    const isPickup = order.shippingMethod === ShippingMethod.PICKUP;
    const title = isPickup ? `Tu pedido #${order.number} está listo` : `Tu pedido #${order.number} va en camino`;
    const items = order.items.map((it) => `${it.name} × ${it.quantity}`);

    const shipBlock = isPickup
      ? `<p style="margin:16px 0 0;font-size:15px;line-height:1.55;color:#262626;">Ya puedes pasar a retirarlo. Si necesitas coordinar día y hora, escríbenos por WhatsApp.</p>`
      : `
      <div style="margin:20px 0 0;padding:16px 18px;border-radius:14px;background:#f8fce0;border:1px solid #b0d800;">
        <div style="${EMAIL_EYEBROW}">Seguimiento del envío</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.7;">
          Courier: <strong>${esc(order.carrier || "Por confirmar")}</strong><br>
          ${order.trackingCode ? `Código de seguimiento: <strong style="font-family:Menlo,Consolas,monospace;letter-spacing:.04em;">${esc(order.trackingCode)}</strong>` : "Te enviaremos el código de seguimiento apenas lo tengamos."}
        </div>
        ${track ? `<div style="margin-top:12px;"><a href="${esc(track)}" style="font-weight:700;color:#7a9600;">Seguir mi envío en ${esc(order.carrier)} →</a></div>` : ""}
        <div style="margin-top:10px;font-size:13px;color:#525252;">Recuerda que el envío es por pagar: el costo lo cancelas al courier al recibir.</div>
      </div>`;

    const body = `
          <div style="${EMAIL_EYEBROW}">Pedido #${order.number}</div>
          <h1 style="margin:8px 0 12px;font-size:22px;line-height:1.2;">${esc(title)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.55;color:#262626;">Hola ${esc(order.firstName)}, ${isPickup ? "tu pedido está listo para retiro." : "tu pedido ya salió de nuestra bodega."}</p>
          ${shipBlock}
          <p style="margin:18px 0 0;font-size:13px;color:#525252;"><strong>Contenido:</strong> ${esc(items.join(" · "))}</p>
          <div style="margin-top:26px;text-align:center;">
            ${emailButton(url, "Ver mi pedido")}
            <p style="margin:16px 0 0;font-size:12px;color:#737373;">${EMAIL_HELP}</p>
          </div>`;

    const text = [
      `Hola ${order.firstName}, ${isPickup ? "tu pedido está listo para retiro." : "tu pedido ya fue despachado."}`,
      "",
      ...(isPickup ? [] : [`Courier: ${order.carrier || "Por confirmar"}`, order.trackingCode ? `Código de seguimiento: ${order.trackingCode}` : "", track ? `Seguimiento: ${track}` : ""]),
      "",
      `Contenido: ${items.join(", ")}`,
      `Ver pedido: ${url}`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    await sendMail({ to: order.email, subject: `${title} · ${SITE.name}`, html: emailShell(title, body), text });
  } catch (err) {
    console.error("[orders] error enviando correo de envío", err);
  }
}

/** Correo breve al marcar el pedido como entregado. Nunca lanza. */
export async function sendDeliveredEmail(orderOrId: string | OrderWithItems) {
  try {
    const order = typeof orderOrId === "string" ? await db.order.findUnique({ where: { id: orderOrId }, include: orderInclude }) : orderOrId;
    if (!order?.email) return;
    const title = `Tu pedido #${order.number} fue entregado`;
    const body = `
          <div style="${EMAIL_EYEBROW}">Pedido #${order.number}</div>
          <h1 style="margin:8px 0 12px;font-size:22px;line-height:1.2;">${esc(title)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.55;color:#262626;">Hola ${esc(order.firstName)}, tu pedido fue entregado. ¡Gracias por comprar en ${esc(SITE.name)}!</p>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#262626;">Si algo no llegó como esperabas, respóndenos este correo o escríbenos por WhatsApp y lo resolvemos.</p>
          <div style="margin-top:26px;text-align:center;">
            ${emailButton(SITE.instagram, "Síguenos en Instagram")}
            <p style="margin:16px 0 0;font-size:12px;color:#737373;">Comparte tu colección y etiquétanos · ${EMAIL_HELP}</p>
          </div>`;
    const text = `Hola ${order.firstName}, tu pedido #${order.number} fue entregado. ¡Gracias por comprar en ${SITE.name}!\n\nSíguenos en Instagram: ${SITE.instagram}\nVer pedido: ${SITE.url}/pedido/${order.id}`;
    await sendMail({ to: order.email, subject: `${title} · ${SITE.name}`, html: emailShell(title, body), text });
  } catch (err) {
    console.error("[orders] error enviando correo de entrega", err);
  }
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export async function getOrderById(id: string) {
  return db.order.findUnique({ where: { id }, include: orderInclude });
}
