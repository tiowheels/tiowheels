"use server";

import { db, PaymentMethod } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createFlowPayment, flowConfigured } from "@/lib/flow";
import { rememberOrder } from "@/lib/order-access";
import { cancelOrderAndRestock, createOrderFromCart, getStoreSettings, OrderError, sendOrderEmails } from "@/lib/orders";
import { SITE } from "@/lib/site";

export type PlaceOrderResult =
  | { ok: true; redirectUrl: string; orderId: string }
  | { ok: false; error: string; field?: string; details?: string[] };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const [user, store] = await Promise.all([getCurrentUser(), getStoreSettings()]);
  const paymentMethod = (input as { paymentMethod?: string } | null)?.paymentMethod;

  if (paymentMethod === "FLOW" && !flowConfigured()) {
    return { ok: false, field: "paymentMethod", error: "El pago en línea no está disponible en este momento. Elige transferencia bancaria." };
  }
  if (paymentMethod === "TRANSFER" && !store.transferEnabled) {
    return { ok: false, field: "paymentMethod", error: "La transferencia bancaria no está disponible en este momento." };
  }

  let order;
  try {
    order = await createOrderFromCart(input, { userId: user?.id ?? null });
  } catch (err) {
    if (err instanceof OrderError) return { ok: false, error: err.message, field: err.field, details: err.details };
    console.error("[checkout] error creando pedido", err);
    return { ok: false, error: "No pudimos crear tu pedido. Inténtalo de nuevo en unos segundos." };
  }
  // Recordamos el pedido en este navegador para que /pedido/[id] muestre el detalle sin pedir el email.
  await rememberOrder(order.id);

  if (order.paymentMethod === PaymentMethod.FLOW) {
    try {
      const flow = await createFlowPayment({
        commerceOrder: String(order.number),
        subject: `Pedido #${order.number} ${SITE.name}`,
        amount: order.total,
        email: order.email!,
        urlConfirmation: `${SITE.url}/api/flow/confirm`,
        urlReturn: `${SITE.url}/api/flow/return`,
        optional: { orderId: order.id },
      });
      await db.payment.create({
        data: { orderId: order.id, provider: PaymentMethod.FLOW, token: flow.token, flowOrder: flow.flowOrder, amount: order.total, status: "pending" },
      });
      return { ok: true, redirectUrl: flow.redirectUrl, orderId: order.id };
    } catch (err) {
      console.error("[checkout] error creando pago Flow", err);
      // Liberamos el stock: el cliente puede volver a intentar sin perder el carrito.
      await cancelOrderAndRestock(order.id).catch(() => {});
      return { ok: false, field: "paymentMethod", error: "No pudimos conectar con Flow. Inténtalo de nuevo o elige transferencia bancaria." };
    }
  }

  await sendOrderEmails(order);
  return { ok: true, redirectUrl: `/pedido/${order.id}`, orderId: order.id };
}
