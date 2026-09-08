/** Etiquetas y tonos de estado de pedido (usable en cliente y servidor). */
import type { OrderStatus, PaymentMethod, ShippingMethod } from "@/generated/prisma/enums";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "lime" | "dark" | "danger" | "success" | "warn" | "outline"; help: string }> = {
  PENDING: { label: "Pendiente de pago", tone: "warn", help: "Estamos esperando la confirmación de tu pago para preparar el pedido." },
  PAID: { label: "Pagado", tone: "success", help: "Recibimos tu pago. Pronto comenzaremos a preparar tu pedido." },
  PROCESSING: { label: "En preparación", tone: "lime", help: "Estamos preparando tu pedido con mucho cuidado." },
  SHIPPED: { label: "Enviado", tone: "dark", help: "Tu pedido va en camino. Recuerda que el envío se paga al courier al recibir." },
  COMPLETED: { label: "Entregado", tone: "success", help: "Pedido entregado. ¡Gracias por coleccionar con nosotros!" },
  CANCELLED: { label: "Cancelado", tone: "danger", help: "Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp." },
  REFUNDED: { label: "Reembolsado", tone: "neutral", help: "El pago de este pedido fue devuelto." },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  FLOW: "Flow (Webpay, tarjetas y más)",
  TRANSFER: "Transferencia bancaria",
  CASH: "Efectivo",
  CARD_POS: "Tarjeta presencial",
  WEBPAY_LEGACY: "Webpay",
  OTHER: "Otro",
};

export const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  DELIVERY_COD: "Envío por pagar",
  PICKUP: "Retiro",
  NONE: "Sin envío",
};
