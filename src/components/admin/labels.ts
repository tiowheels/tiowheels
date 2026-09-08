/** Etiquetas en español para enums del panel (usable en cliente y servidor). */
import type { OrderStatus, OrderChannel, PaymentMethod, PaymentStatus, ShippingMethod, ProductStatus } from "@/generated/prisma/enums";
import { trackingUrl } from "@/lib/shipping";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "lime" | "dark" | "danger" | "success" | "warn" | "outline" }> = {
  PENDING: { label: "Pendiente de pago", tone: "warn" },
  PAID: { label: "Pagado", tone: "lime" },
  PROCESSING: { label: "En preparación", tone: "dark" },
  SHIPPED: { label: "Enviado", tone: "success" },
  COMPLETED: { label: "Completado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
  REFUNDED: { label: "Reembolsado", tone: "outline" },
};

export const ORDER_STATUS_LIST = Object.keys(ORDER_STATUS) as OrderStatus[];

export const ORDER_CHANNEL: Record<OrderChannel, { label: string; short: string }> = {
  WEB: { label: "Web", short: "Web" },
  MANUAL: { label: "Venta rápida", short: "Manual" },
  LEGACY_WEB: { label: "Web (WooCommerce)", short: "Woo web" },
  LEGACY_APP: { label: "App (WooCommerce)", short: "Woo app" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  FLOW: "Flow (online)",
  TRANSFER: "Transferencia",
  CASH: "Efectivo",
  CARD_POS: "Tarjeta / Webpay presencial",
  WEBPAY_LEGACY: "Webpay (sitio anterior)",
  OTHER: "Otro",
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: "warn" | "success" | "outline" }> = {
  UNPAID: { label: "Sin pagar", tone: "warn" },
  PAID: { label: "Pagado", tone: "success" },
  REFUNDED: { label: "Reembolsado", tone: "outline" },
};

export const SHIPPING_METHOD: Record<ShippingMethod, string> = {
  DELIVERY_COD: "Envío por pagar",
  PICKUP: "Retiro",
  NONE: "Sin envío (presencial)",
};

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: "success" | "warn" | "outline" }> = {
  ACTIVE: { label: "Activo", tone: "success" },
  DRAFT: { label: "Borrador", tone: "warn" },
  ARCHIVED: { label: "Archivado", tone: "outline" },
};

/** Métodos de pago disponibles en venta rápida. */
export const MANUAL_PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CARD_POS", label: "Tarjeta / Webpay" },
  { value: "OTHER", label: "Otro" },
];

/** Normaliza un teléfono chileno a formato wa.me (56XXXXXXXXX). */
export function whatsappNumber(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 8) digits = "9" + digits;
  if (digits.length === 9) digits = "56" + digits;
  if (!digits.startsWith("56") || digits.length < 11) return null;
  return digits;
}

export function whatsappTo(phone: string | null | undefined, text: string) {
  const n = whatsappNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/** Mensaje sugerido de WhatsApp según el estado del pedido. */
export function orderWhatsappMessage(o: { number: number; firstName: string; status: OrderStatus; total: number; carrier?: string | null; trackingCode?: string | null }) {
  const name = o.firstName?.trim() || "";
  const hi = name ? `Hola ${name}` : "Hola";
  const tracking = o.trackingCode
    ? ` ${o.carrier ? `Va por ${o.carrier}, ` : ""}código de seguimiento: ${o.trackingCode}${trackingUrl(o.carrier, o.trackingCode) ? ` · ${trackingUrl(o.carrier, o.trackingCode)}` : ""}.`
    : "";
  switch (o.status) {
    case "PENDING":
      return `${hi}, te escribimos de Tío Wheels por tu pedido #${o.number}. ¿Pudiste realizar el pago? Cuando lo tengas, envíanos el comprobante por aquí y lo dejamos listo.`;
    case "PAID":
      return `${hi}, recibimos el pago de tu pedido #${o.number} en Tío Wheels. ¡Gracias! Lo estamos preparando y te avisamos cuando salga.`;
    case "PROCESSING":
      return `${hi}, tu pedido #${o.number} de Tío Wheels está en preparación. Te avisamos apenas lo despachemos.`;
    case "SHIPPED":
      return `${hi}, tu pedido #${o.number} de Tío Wheels ya fue enviado.${tracking} Cualquier duda nos escribes por aquí.`;
    case "COMPLETED":
      return `${hi}, gracias por tu compra en Tío Wheels (pedido #${o.number}).${tracking} ¡Esperamos que la disfrutes! Cuéntanos si todo llegó bien.`;
    case "CANCELLED":
      return `${hi}, te escribimos de Tío Wheels por tu pedido #${o.number}, que fue cancelado. Si quieres retomarlo o tienes dudas, avísanos por aquí.`;
    case "REFUNDED":
      return `${hi}, te escribimos de Tío Wheels: el reembolso de tu pedido #${o.number} ya fue gestionado. Cualquier consulta, aquí estamos.`;
  }
}
