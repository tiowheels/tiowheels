"use server";

import { after } from "next/server";

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
  const order = await db.order.findUnique({
    where: { id },
    select: { status: true, paymentStatus: true, shippedAt: true, email: true, items: { select: { productId: true, quantity: true, name: true } } },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  // Al cancelar se devolvió el stock; si el pedido revive hay que volver a descontarlo,
  // si no el catálogo queda con unidades que ya están vendidas.
  const revive = order.status === "CANCELLED" && status !== "REFUNDED";
  const data: { status: OrderStatus; paymentStatus?: "PAID" | "REFUNDED"; paidAt?: Date; shippedAt?: Date } = { status };
  // Estados "posteriores al pago" implican pago recibido
  if (["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(status) && order.paymentStatus !== "PAID") {
    data.paymentStatus = "PAID";
    data.paidAt = new Date();
  }
  if (status === "REFUNDED") data.paymentStatus = "REFUNDED";
  if (status === "SHIPPED" && !order.shippedAt) data.shippedAt = new Date();
  const sinStock: string[] = [];
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data });
    if (!revive) return;
    for (const it of order.items) {
      if (!it.productId) continue;
      const p = await tx.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity }, totalSales: { increment: it.quantity } },
        select: { name: true, stock: true },
      });
      if (p.stock < 0) sinStock.push(`${p.name} (queda en ${p.stock})`);
    }
  });
  if (revive) revalidatePath("/admin/productos");

  // Avisos al cliente (solo si hay email; sendMail no falla sin SMTP).
  let notice = "";
  if (order.email && status !== order.status) {
    if (status === "SHIPPED") {
      after(() => sendShippedEmail(id));
      notice = " y aviso enviado al cliente";
    } else if (status === "COMPLETED") {
      after(() => sendDeliveredEmail(id));
      notice = " y aviso enviado al cliente";
    }
  }
  revalidateOrder(id);
  if (sinStock.length) return { ok: true, message: `Estado actualizado${notice}. Ojo: quedó sin stock ${sinStock.join(", ")}` };
  return { ok: true, message: `Estado actualizado${notice}${revive ? " y el stock se volvió a descontar" : ""}` };
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
  if (order.email) after(() => sendShippedEmail(id));
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

/**
 * Borra el pedido del historial. Si todavía descontaba stock (no estaba cancelado),
 * primero lo repone. Pensado para pedidos de prueba: no se puede deshacer.
 */
export async function deleteOrder(input: { id: string; restock?: boolean }): Promise<ActionResult> {
  await requireAdmin();
  const id = z.string().min(1).parse(input.id);
  const restock = input.restock !== false;
  const order = await db.order.findUnique({ where: { id }, select: { number: true, status: true, items: { select: { productId: true, quantity: true } } } });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  const descontaba = order.status !== "CANCELLED" && order.status !== "REFUNDED";
  await db.$transaction(async (tx) => {
    if (restock && descontaba) {
      for (const it of order.items) {
        if (!it.productId) continue;
        await tx.product.updateMany({ where: { id: it.productId }, data: { stock: { increment: it.quantity }, totalSales: { decrement: it.quantity } } });
      }
    }
    await tx.order.delete({ where: { id } });
  });
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/");
  return { ok: true, message: restock && descontaba ? `Pedido #${order.number} eliminado y stock repuesto` : `Pedido #${order.number} eliminado` };
}

/* ---------- Edición del pedido ---------- */

const editarItemsSchema = z.object({
  id: z.string().min(1),
  items: z.array(z.object({ id: z.string().min(1), quantity: z.number().int().min(0).max(999) })).min(1),
});

/**
 * Cambia cantidades o quita autos de un pedido. Si el pedido tiene el stock tomado
 * (cualquier estado menos cancelado), lo que se quita vuelve al catálogo y lo que
 * se agrega se descuenta. Recalcula subtotal y total.
 */
export async function updateOrderItems(input: { id: string; items: { id: string; quantity: number }[] }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = editarItemsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Cantidades inválidas" };
  const { id, items } = parsed.data;
  const nuevas = new Map(items.map((i) => [i.id, i.quantity]));

  try {
    const cambios = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, select: { status: true, discount: true, shippingCost: true, adminNote: true, items: { select: { id: true, productId: true, name: true, price: true, quantity: true } } } });
      if (!order) throw new Error("Pedido no encontrado");
      const tomaStock = order.status !== "CANCELLED";
      const finales = order.items.map((it) => ({ ...it, nueva: nuevas.get(it.id) ?? it.quantity }));
      if (finales.every((f) => f.nueva === 0)) throw new Error("El pedido no puede quedar sin autos. Si no va, cancélalo.");

      const notas: string[] = [];
      for (const f of finales) {
        const delta = f.nueva - f.quantity;
        if (delta === 0) continue;
        if (tomaStock && f.productId) {
          if (delta > 0) {
            const r = await tx.product.updateMany({ where: { id: f.productId, stock: { gte: delta } }, data: { stock: { decrement: delta }, totalSales: { increment: delta } } });
            if (r.count !== 1) throw new Error(`No hay stock suficiente de "${f.name}" para subir la cantidad`);
          } else {
            await tx.product.update({ where: { id: f.productId }, data: { stock: { increment: -delta }, totalSales: { decrement: -delta } } });
          }
        }
        if (f.nueva === 0) await tx.orderItem.delete({ where: { id: f.id } });
        else await tx.orderItem.update({ where: { id: f.id }, data: { quantity: f.nueva, total: f.price * f.nueva } });
        notas.push(f.nueva === 0 ? `se quitó ${f.name}` : `${f.name}: ${f.quantity} → ${f.nueva}`);
      }
      if (!notas.length) return 0;

      const subtotal = finales.reduce((a, f) => a + f.price * f.nueva, 0);
      const discount = Math.min(order.discount, subtotal);
      const fecha = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", timeZone: "America/Santiago" }).format(new Date());
      const nota = `Editado el ${fecha}: ${notas.join("; ")}.`;
      await tx.order.update({ where: { id }, data: { subtotal, discount, total: subtotal - discount + order.shippingCost, adminNote: order.adminNote ? `${order.adminNote}\n${nota}` : nota } });
      return notas.length;
    });
    revalidateOrder(id);
    revalidatePath("/admin/productos");
    return { ok: true, message: cambios ? "Pedido actualizado y stock ajustado" : "Sin cambios" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo editar el pedido" };
  }
}

const editarClienteSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1, "Falta el nombre").max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  rut: z.string().trim().max(20).optional().default(""),
  address1: z.string().trim().max(200).optional().default(""),
  address2: z.string().trim().max(120).optional().default(""),
  commune: z.string().trim().max(120).optional().default(""),
  region: z.string().trim().max(10).optional().default(""),
  shippingMethod: z.enum(["DELIVERY_COD", "PICKUP", "NONE"]),
});

/** Corrige los datos del cliente y de entrega guardados en el pedido. */
export async function updateOrderCustomer(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = editarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const d = parsed.data;
  const email = d.email.toLowerCase();
  if (email && !z.string().email().safeParse(email).success) return { ok: false, error: "El correo no es válido" };
  try {
    await db.order.update({
      where: { id: d.id },
      data: {
        firstName: d.firstName,
        lastName: d.lastName || null,
        email: email || null,
        phone: d.phone || null,
        rut: d.rut || null,
        address1: d.address1 || null,
        address2: d.address2 || null,
        commune: d.commune || null,
        city: d.commune || null,
        region: d.region || null,
        shippingMethod: d.shippingMethod,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar" };
  }
  revalidateOrder(d.id);
  return { ok: true, message: "Datos del pedido actualizados" };
}
