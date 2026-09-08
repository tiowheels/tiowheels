"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/db";
import { createFlowPayment, flowConfigured } from "@/lib/flow";
import { markOrderVerified } from "@/lib/order-access";
import { clientIp, rateLimit, retryMessage } from "@/lib/rate-limit";
import { SITE } from "@/lib/site";

/** Crea un nuevo intento de pago en Flow para un pedido que sigue pendiente y redirige. */
export async function retryFlowPayment(formData: FormData) {
  const parsed = z.string().min(1).safeParse(formData.get("orderId"));
  if (!parsed.success) redirect("/");
  const orderId = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) redirect("/");
  if (!flowConfigured() || order.paymentMethod !== PaymentMethod.FLOW || order.status !== OrderStatus.PENDING || order.paymentStatus !== PaymentStatus.UNPAID) {
    redirect(`/pedido/${orderId}`);
  }

  let redirectUrl: string;
  try {
    const flow = await createFlowPayment({
      commerceOrder: `${order.number}-${Date.now().toString(36)}`,
      subject: `Pedido #${order.number} ${SITE.name}`,
      amount: order.total,
      email: order.email ?? SITE.email,
      urlConfirmation: `${SITE.url}/api/flow/confirm`,
      urlReturn: `${SITE.url}/api/flow/return`,
      optional: { orderId: order.id },
    });
    await db.payment.create({
      data: { orderId: order.id, provider: PaymentMethod.FLOW, token: flow.token, flowOrder: flow.flowOrder, amount: order.total, status: "pending" },
    });
    redirectUrl = flow.redirectUrl;
  } catch (err) {
    console.error("[pedido] error reintentando pago Flow", err);
    redirect(`/pedido/${orderId}?pago=error`);
  }
  redirect(redirectUrl);
}

/* ------------------------------------------------------------------ */
/* Verificación por email para ver el detalle del pedido               */
/* ------------------------------------------------------------------ */

const verifySchema = z.object({
  orderId: z.string().trim().min(1).max(64),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Ingresa un email válido")),
});

export type VerifyOrderResult = { ok: true } | { ok: false; error: string };

/**
 * Si el email coincide con el del pedido, deja una cookie firmada (30 días) que
 * habilita el detalle completo en este navegador. Limitado a 5 intentos por IP cada 15 min.
 */
export async function verifyOrderEmail(orderId: string, email: string): Promise<VerifyOrderResult> {
  const limit = rateLimit(`order-verify:${await clientIp()}`, 5, 15 * 60);
  if (!limit.ok) return { ok: false, error: retryMessage(limit) };

  const parsed = verifySchema.safeParse({ orderId, email });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ingresa un email válido" };

  const order = await db.order.findUnique({ where: { id: parsed.data.orderId }, select: { id: true, email: true } });
  if (!order?.email || order.email.toLowerCase() !== parsed.data.email) {
    return { ok: false, error: "El email no coincide con el de este pedido. Revisa que sea el mismo que usaste al comprar." };
  }
  await markOrderVerified(order.id);
  return { ok: true };
}
