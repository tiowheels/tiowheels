"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validateRut } from "@/lib/format";

export type ClienteResult = { ok: true; id: string; message: string } | { ok: false; error: string };

const esquema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(80).optional().default(""),
  lastName: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  rut: z.string().trim().max(20).optional().default(""),
  address1: z.string().trim().max(200).optional().default(""),
  address2: z.string().trim().max(120).optional().default(""),
  region: z.string().trim().max(10).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
});

/** Guarda los datos de contacto y despacho de un cliente desde el panel. */
export async function updateCustomer(formData: FormData): Promise<ClienteResult> {
  await requireAdmin();
  const parsed = esquema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const d = parsed.data;
  if (d.rut && !validateRut(d.rut)) return { ok: false, error: "El RUT no es válido" };

  try {
    await db.user.update({
      where: { id: d.id },
      data: {
        name: d.name || null,
        lastName: d.lastName || null,
        phone: d.phone || null,
        rut: d.rut || null,
        address1: d.address1 || null,
        address2: d.address2 || null,
        region: d.region || null,
        city: d.city || null,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar" };
  }
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${d.id}`);
  return { ok: true, id: d.id, message: "Datos guardados" };
}

/**
 * Crea la ficha de alguien que compró sin registrarse, con los datos de su último
 * pedido, y le engancha todos los pedidos que tenga con ese mismo correo.
 */
export async function createCustomerFromOrders(formData: FormData): Promise<ClienteResult> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { ok: false, error: "Correo inválido" };

  const ya = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (ya) {
    await db.order.updateMany({ where: { email: { equals: email, mode: "insensitive" }, userId: null }, data: { userId: ya.id } });
    revalidatePath("/admin/clientes");
    return { ok: true, id: ya.id, message: "El cliente ya tenía ficha; se enlazaron sus pedidos" };
  }

  const ultimo = await db.order.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: { firstName: true, lastName: true, phone: true, rut: true, address1: true, address2: true, city: true, region: true, createdAt: true },
  });
  if (!ultimo) return { ok: false, error: "No hay pedidos con ese correo" };

  try {
    const creado = await db.user.create({
      data: {
        email,
        role: "CUSTOMER",
        name: ultimo.firstName || null,
        lastName: ultimo.lastName,
        phone: ultimo.phone,
        rut: ultimo.rut,
        address1: ultimo.address1,
        address2: ultimo.address2,
        city: ultimo.city,
        region: ultimo.region,
        createdAt: ultimo.createdAt,
      },
      select: { id: true },
    });
    await db.order.updateMany({ where: { email: { equals: email, mode: "insensitive" }, userId: null }, data: { userId: creado.id } });
    revalidatePath("/admin/clientes");
    return { ok: true, id: creado.id, message: "Ficha creada con los datos de su último pedido" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear la ficha" };
  }
}
