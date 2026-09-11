"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
        price: z.number().int().min(0).max(100_000_000),
      }),
    )
    .min(1, "Agrega al menos un producto"),
  customer: z
    .object({
      name: z.string().trim().max(120).optional().default(""),
      phone: z.string().trim().max(30).optional().default(""),
      email: z.string().trim().max(160).optional().default(""),
      rut: z.string().trim().max(20).optional().default(""),
      address1: z.string().trim().max(200).optional().default(""),
      region: z.string().trim().max(10).optional().default(""),
      city: z.string().trim().max(120).optional().default(""),
      save: z.boolean().optional().default(false),
    })
    .optional()
    .default({ name: "", phone: "", email: "", rut: "", address1: "", region: "", city: "", save: false }),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD_POS", "OTHER"]),
  shippingMethod: z.enum(["NONE", "PICKUP", "DELIVERY_COD"]).default("NONE"),
  note: z.string().trim().max(1000).optional().default(""),
  discount: z.number().int().min(0).max(100_000_000).optional().default(0),
});

export type ManualSaleInput = z.input<typeof saleSchema>;
export type ManualSaleResult = { ok: true; id: string; number: number; total: number } | { ok: false; error: string };

/**
 * Registra una venta manual (feria, Instagram, presencial):
 * crea el pedido COMPLETED/PAID, sus items con snapshot y descuenta stock en una transacción.
 */
export async function registerManualSale(input: ManualSaleInput): Promise<ManualSaleResult> {
  await requireAdmin();
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;

  // Consolida líneas repetidas del mismo producto (mismo precio)
  const merged = new Map<string, { productId: string; quantity: number; price: number }>();
  for (const it of data.items) {
    const key = `${it.productId}:${it.price}`;
    const prev = merged.get(key);
    if (prev) prev.quantity += it.quantity;
    else merged.set(key, { ...it });
  }
  const lines = [...merged.values()];
  const ids = [...new Set(lines.map((l) => l.productId))];

  const email = data.customer.email ? data.customer.email.toLowerCase() : null;
  const emailValid = email ? z.string().email().safeParse(email).success : false;
  if (email && !emailValid) return { ok: false, error: "El correo del cliente no es válido" };

  try {
    const result = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, stock: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } } });
      const byId = new Map(products.map((p) => [p.id, p]));
      // Verifica stock total por producto (sumando líneas)
      const needed = new Map<string, number>();
      for (const l of lines) needed.set(l.productId, (needed.get(l.productId) ?? 0) + l.quantity);
      for (const [pid, qty] of needed) {
        const p = byId.get(pid);
        if (!p) throw new Error("Un producto del ticket ya no existe");
        if (p.stock < qty) throw new Error(`Stock insuficiente de "${p.name}" (quedan ${p.stock})`);
      }
      // Descuenta con verificación atómica
      for (const [pid, qty] of needed) {
        const r = await tx.product.updateMany({ where: { id: pid, stock: { gte: qty } }, data: { stock: { decrement: qty }, totalSales: { increment: qty } } });
        if (r.count !== 1) throw new Error(`Stock insuficiente de "${byId.get(pid)?.name ?? "producto"}"`);
      }

      const subtotal = lines.reduce((a, l) => a + l.price * l.quantity, 0);
      const discount = Math.min(data.discount, subtotal);
      const total = subtotal - discount;

      const nameParts = data.customer.name.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || "Cliente";
      const lastName = nameParts.slice(1).join(" ") || null;

      // Vincula al cliente por correo; si se pidió guardarlo y no existe, se crea la ficha
      const datosCliente = {
        name: firstName,
        lastName,
        phone: data.customer.phone || null,
        rut: data.customer.rut || null,
        address1: data.customer.address1 || null,
        city: data.customer.city || null,
        region: data.customer.region || null,
      };
      const user = emailValid
        ? data.customer.save
          ? await tx.user.upsert({ where: { email: email! }, create: { email: email!, role: "CUSTOMER", ...datosCliente }, update: datosCliente, select: { id: true } })
          : await tx.user.findUnique({ where: { email: email! }, select: { id: true } })
        : null;

      const order = await tx.order.create({
        data: {
          channel: "MANUAL",
          status: "COMPLETED",
          paymentMethod: data.paymentMethod,
          paymentStatus: "PAID",
          paidAt: new Date(),
          subtotal,
          discount,
          shippingCost: 0,
          total,
          firstName,
          lastName,
          email: emailValid ? email : null,
          phone: data.customer.phone || null,
          rut: data.customer.rut || null,
          address1: data.customer.address1 || null,
          city: data.customer.city || null,
          region: data.customer.region || null,
          shippingMethod: data.shippingMethod,
          adminNote: data.note || null,
          userId: user?.id ?? null,
          items: {
            create: lines.map((l) => {
              const p = byId.get(l.productId)!;
              return { productId: l.productId, name: p.name, price: l.price, quantity: l.quantity, total: l.price * l.quantity, imagePath: p.images[0]?.path ?? null };
            }),
          },
          payments: { create: { provider: data.paymentMethod, amount: total, status: "paid", raw: { source: "venta-rapida" } } },
        },
        select: { id: true, number: true, total: true },
      });
      return order;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/productos");
    revalidatePath("/admin/clientes");
    revalidatePath("/tienda");
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo registrar la venta" };
  }
}
