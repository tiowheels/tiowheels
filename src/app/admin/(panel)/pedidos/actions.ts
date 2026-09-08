"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, OrderStatus } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendDeliveredEmail, sendShippedEmail } from "@/lib/orders";
import { CARRIER_VALUES } from "@/lib/shipping";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function revalidateOrder(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath(`/pedido/${id}`);
}

const statusSchema = z.object({ id: z.string().min(1), status: z.enum(OrderStatus) });

/** Cambia el estado del pedido. Si pasa a CANCELLED/REFUNDED usa cancelOrder para reponer stock. */
export async function updateOrderStatus(input: { id: string; status: OrderStatus }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Estado inválido" };
  const { id, status } = parsed.data;
  if (status === "CANCELLED") return cancelOrder({ id, restock: true });
  const order = await db.order.findUnique({ where: { id }, select: { status: true, paymentStatus: true, shippedAt: true, email: true } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  const data: { status: OrderStatus; paymentStatus?: "PAID" | "REFUNDED"; paidAt?: Date; shippedAt?: Date } = { status };
  // Estados "posteriores al pago" implican pago recibido
  if (["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(status) && order.paymentStatus !== "PAID") {
    data.paymentStatus = "PAID";
    data.paidAt = new Date();
  }
  if (status === "REFUNDED") data.paymentStatus = "REFUNDED";
  if (status === "SHIPPED" && !order.shippedAt) data.shippedAt = new Date();
  await db.order.update({ where: { id }, data });

  // Avisos al cliente (solo si hay email; sendMail no falla sin SMTP).
  let notice = "";
  if (order.email && status !== order.status) {
    if (status === "SHIPPED") {
      await sendShippedEmail(id);
      notice = " y aviso enviado al cliente";
    } else if (status === "COMPLETED") {
      await sendDeliveredEmail(id);
      notice = " y correo de agradecimiento enviado";
    }
  }
  revalidateOrder(id);
  return { ok: true, message: `Estado actualizado${notice}` };
}

const shipSchema = z.object({
  id: z.string().min(1),
  carrier: z.enum(CARRIER_VALUES, { error: "Elige un courier" }),
  trackingCode: z
    .string()
    .trim()
    .max(60, "Código demasiado largo")
    .regex(/^[A-Za-z0-9 \-_./]*$/, "El código solo puede tener letras, números y guiones"),
});

/**
 * Guarda courier + código de seguimiento, marca el pedido como ENVIADO (con shippedAt)
 * y avisa al cliente por correo con el enlace de seguimiento.
 */
export async function markOrderShipped(input: { id: string; carrier: string; trackingCode: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = shipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const { id, carrier, trackingCode } = parsed.data;
  const order = await db.order.findUnique({ where: { id }, select: { status: true, paymentStatus: true, shippedAt: true, email: true } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.status === "CANCELLED" || order.status === "REFUNDED") return { ok: false, error: "El pedido está cancelado o reembolsado" };

  await db.order.update({
    where: { id },
    data: {
      carrier,
      trackingCode: trackingCode || null,
      shippedAt: order.shippedAt ?? new Date(),
      status: order.status === "COMPLETED" ? "COMPLETED" : "SHIPPED",
      ...(order.paymentStatus !== "PAID" ? { paymentStatus: "PAID", paidAt: new Date() } : {}),
    },
  });
  if (order.email) await sendShippedEmail(id);
  revalidateOrder(id);
  return { ok: true, message: order.email ? "Pedido marcado como enviado y aviso enviado al cliente" : "Pedido marcado como enviado (sin email para avisar)" };
}

/** Marca el pedido como pagado (transferencias). */
export async function markOrderPaid(input: { id: string }): Promise<ActionResult> {
  await requireAdmin();
  const id = z.string().min(1).parse(input.id);
  const order = await db.order.findUnique({ where: { id }, select: { status: true, paymentStatus: true, paymentMethod: true, total: true } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.status === "CANCELLED" || order.status === "REFUNDED") return { ok: false, error: "El pedido está cancelado o reembolsado" };
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { paymentStatus: "PAID", paidAt: new Date(), status: order.status === "PENDING" ? "PAID" : order.status },
    });
    const existing = await tx.payment.findFirst({ where: { orderId: id, status: "paid" } });
    if (!existing) {
      await tx.payment.create({ data: { orderId: id, provider: order.paymentMethod, amount: order.total, status: "paid", raw: { source: "admin", markedAt: new Date().toISOString() } } });
    }
  });
  revalidateOrder(id);
  return { ok: true, message: "Pedido marcado como pagado" };
}

/** Cancela el pedido y repone el stock de los items con producto vinculado. */
export async function cancelOrder(input: { id: string; restock?: boolean }): Promise<ActionResult> {
  await requireAdmin();
  const id = z.string().min(1).parse(input.id);
  const restock = input.restock !== false;
  const order = await db.order.findUnique({ where: { id }, select: { status: true, items: { select: { productId: true, quantity: true } } } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.status === "CANCELLED") return { ok: false, error: "El pedido ya estaba cancelado" };
  const wasRefunded = order.status === "REFUNDED";
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
    if (restock && !wasRefunded) {
      for (const it of order.items) {
        if (!it.productId) continue;
        await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity }, totalSales: { decrement: it.quantity } } });
      }
    }
  });
  revalidateOrder(id);
  revalidatePath("/admin/productos");
  return { ok: true, message: restock ? "Pedido cancelado y stock repuesto" : "Pedido cancelado" };
}

export async function saveAdminNote(input: { id: string; note: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().min(1), note: z.string().max(2000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nota inválida" };
  await db.order.update({ where: { id: parsed.data.id }, data: { adminNote: parsed.data.note.trim() || null } });
  revalidateOrder(parsed.data.id);
  return { ok: true, message: "Nota guardada" };
}
