"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export type MessageActionResult = { ok: true; message?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/admin");
  revalidatePath("/admin/mensajes");
  revalidatePath("/admin", "layout");
}

const idSchema = z.string().min(1).max(64);

/** Marca un mensaje como leído o no leído. */
export async function setMessageRead(input: { id: string; read: boolean }): Promise<MessageActionResult> {
  await requireAdmin();
  const parsed = z.object({ id: idSchema, read: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const r = await db.contactMessage.updateMany({ where: { id: parsed.data.id }, data: { read: parsed.data.read } });
  if (r.count === 0) return { ok: false, error: "Mensaje no encontrado" };
  revalidate();
  return { ok: true, message: parsed.data.read ? "Marcado como leído" : "Marcado como no leído" };
}

/** Elimina un mensaje de contacto. */
export async function deleteMessage(input: { id: string }): Promise<MessageActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(input.id);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const r = await db.contactMessage.deleteMany({ where: { id: parsed.data } });
  if (r.count === 0) return { ok: false, error: "Mensaje no encontrado" };
  revalidate();
  return { ok: true, message: "Mensaje eliminado" };
}

/** Marca todos los mensajes como leídos. */
export async function markAllMessagesRead(): Promise<MessageActionResult> {
  await requireAdmin();
  const r = await db.contactMessage.updateMany({ where: { read: false }, data: { read: true } });
  revalidate();
  return { ok: true, message: r.count === 0 ? "No había mensajes sin leer" : `${r.count} ${r.count === 1 ? "mensaje marcado" : "mensajes marcados"} como leídos` };
}
