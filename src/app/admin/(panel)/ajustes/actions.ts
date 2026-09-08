"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, verifyPassword, setPasswordAndRotateSessions, createSession } from "@/lib/auth";
import { storeSettingsSchema, type StoreSettings } from "@/app/admin/_lib/settings";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function saveStoreSettings(input: StoreSettings): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  await db.setting.upsert({ where: { key: "store" }, create: { key: "store", value: parsed.data }, update: { value: parsed.data } });
  revalidatePath("/admin/ajustes");
  revalidatePath("/checkout");
  revalidatePath("/contacto");
  revalidatePath("/");
  return { ok: true, message: "Ajustes guardados" };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Ingresa tu contraseña actual"),
    next: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

export async function changeAdminPassword(input: { current: string; next: string; confirm: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await db.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(parsed.data.current, user?.passwordHash))) return { ok: false, error: "La contraseña actual no es correcta" };
  const updated = await setPasswordAndRotateSessions(admin.id, parsed.data.next);
  await createSession(updated); // mantiene esta sesión y cierra las demás
  return { ok: true, message: "Contraseña actualizada" };
}

export async function removeNewsletterEmail(input: { email: string }): Promise<ActionResult> {
  await requireAdmin();
  const row = await db.setting.findUnique({ where: { key: "newsletter" } });
  const list = Array.isArray(row?.value) ? (row!.value as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const next = list.filter((e) => e.toLowerCase() !== input.email.toLowerCase());
  await db.setting.upsert({ where: { key: "newsletter" }, create: { key: "newsletter", value: next }, update: { value: next } });
  revalidatePath("/admin/ajustes");
  return { ok: true, message: "Suscriptor eliminado" };
}
