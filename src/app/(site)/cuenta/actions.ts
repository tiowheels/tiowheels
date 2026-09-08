"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, Role } from "@/lib/db";
import { authenticate, createSession, destroySession, getCurrentUser, hashPassword, verifyPassword, setPasswordAndRotateSessions } from "@/lib/auth";
import { clientIp, rateLimit, retryMessage } from "@/lib/rate-limit";
import { formatRut, validateRut } from "@/lib/format";
import { REGION_BY_CODE } from "@/lib/chile";
import { sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

export type FormState = { ok: boolean; message?: string; field?: string; migrated?: boolean; email?: string } | null;

const email = z.string().trim().toLowerCase().pipe(z.email("Ingresa un email válido"));
const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100, "Contraseña demasiado larga");

/** Solo permitimos rutas internas para `next`. */
function safeNext(raw: unknown, fallback = "/cuenta") {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

function firstIssue(err: z.ZodError): FormState {
  const issue = err.issues[0];
  return { ok: false, message: issue?.message ?? "Revisa el formulario", field: issue?.path?.[0]?.toString() };
}

/* ------------------------------------------------------------------ */
/* Ingresar                                                            */
/* ------------------------------------------------------------------ */

const loginSchema = z.object({ email, password: z.string().min(1, "Ingresa tu contraseña"), next: z.string().optional() });

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const { email: mail, password: pw } = parsed.data;

  const ip = await clientIp();
  const byIp = rateLimit(`login:ip:${ip}`, 20, 15 * 60);
  const byMail = rateLimit(`login:mail:${mail}`, 8, 15 * 60);
  if (!byIp.ok) return { ok: false, email: mail, message: retryMessage(byIp) };
  if (!byMail.ok) return { ok: false, email: mail, message: retryMessage(byMail) };

  const user = await authenticate(mail, pw);
  if (!user) {
    const existing = await db.user.findUnique({ where: { email: mail }, select: { passwordHash: true } });
    if (existing && !existing.passwordHash) {
      return { ok: false, migrated: true, email: mail, message: "Tu cuenta fue migrada al nuevo sitio: crea una contraseña nueva para ingresar." };
    }
    return { ok: false, email: mail, message: "Email o contraseña incorrectos." };
  }

  await createSession(user);
  redirect(user.role === Role.ADMIN ? safeNext(parsed.data.next, "/admin") : safeNext(parsed.data.next));
}

/* ------------------------------------------------------------------ */
/* Registro                                                            */
/* ------------------------------------------------------------------ */

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresa tu nombre").max(80),
    lastName: z.string().trim().max(80).optional().default(""),
    email,
    phone: z.string().trim().min(8, "Ingresa un teléfono válido").max(20).regex(/^[+\d\s()-]+$/, "Ingresa un teléfono válido"),
    password,
    confirm: z.string(),
    next: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;

  const reg = rateLimit(`register:ip:${await clientIp()}`, 5, 60 * 60);
  if (!reg.ok) return { ok: false, message: retryMessage(reg) };

  const existing = await db.user.findUnique({ where: { email: d.email }, select: { id: true, passwordHash: true } });
  if (existing) {
    if (!existing.passwordHash) {
      return { ok: false, migrated: true, email: d.email, field: "email", message: "Este email ya tiene una cuenta migrada del sitio anterior. Crea una contraseña nueva para ingresar." };
    }
    return { ok: false, field: "email", message: "Ya existe una cuenta con este email. ¿Quieres ingresar?" };
  }

  const user = await db.user.create({
    data: {
      email: d.email,
      name: d.name,
      lastName: d.lastName || null,
      phone: d.phone,
      passwordHash: await hashPassword(d.password),
      role: Role.CUSTOMER,
    },
  });
  await createSession(user);
  redirect(safeNext(d.next));
}

/* ------------------------------------------------------------------ */
/* Recuperar contraseña                                                */
/* ------------------------------------------------------------------ */

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const mail = parsed.data.email;

  const ipLimit = rateLimit(`reset:ip:${await clientIp()}`, 5, 60 * 60);
  const mailLimit = rateLimit(`reset:mail:${mail}`, 3, 60 * 60);
  if (!ipLimit.ok || !mailLimit.ok) return { ok: false, message: retryMessage(ipLimit.ok ? (mailLimit as { retryAfterSec: number }) : ipLimit) };

  const user = await db.user.findUnique({ where: { email: mail }, select: { id: true, name: true } });
  // Respondemos igual exista o no la cuenta, para no revelar emails registrados.
  if (user) {
    const token = randomBytes(32).toString("hex");
    // Se guarda solo el hash: si alguien lee la BD no puede usar los enlaces.
    await db.$transaction([
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      db.passwordResetToken.create({ data: { userId: user.id, token: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
    ]);
    const link = `${SITE.url}/cuenta/recuperar/${token}`;
    if (process.env.NODE_ENV !== "production") console.info(`[auth] enlace de recuperación para ${mail}: ${link}`);
    await sendMail({
      to: mail,
      subject: `Crea tu nueva contraseña · ${SITE.name}`,
      text: `Hola${user.name ? ` ${user.name}` : ""},\n\nPara crear una nueva contraseña en ${SITE.name} entra a este enlace (válido por 1 hora):\n${link}\n\nSi no lo pediste, ignora este correo.`,
      html: resetEmailHtml(user.name, link),
    });
  }
  return { ok: true, email: mail, message: "Si el email está registrado, te enviamos un enlace para crear tu nueva contraseña. Revisa también la carpeta de spam." };
}

function resetEmailHtml(name: string | null, link: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f5;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;">
      <tr><td align="center" style="background:#0a0a0a;padding:22px;"><img src="${SITE.url}/brand/logo.png" alt="${esc(SITE.name)}" width="180" style="display:block;max-width:180px;height:auto;"></td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:22px;">Crea tu nueva contraseña</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#262626;">Hola${name ? ` ${esc(name)}` : ""}, recibimos una solicitud para crear una nueva contraseña en ${esc(SITE.name)}. El enlace es válido por 1 hora.</p>
        <p style="margin:0 0 18px;" align="center"><a href="${link}" style="display:inline-block;background:#b0d800;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;">Crear contraseña</a></p>
        <p style="margin:0;font-size:12px;color:#737373;">Si no lo pediste, puedes ignorar este correo. Enlace: <a href="${link}" style="color:#7a9600;word-break:break-all;">${link}</a></p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const resetSchema = z
  .object({ token: z.string().min(10, "Enlace inválido"), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const { token, password: pw } = parsed.data;

  const guard = rateLimit(`reset:use:${await clientIp()}`, 10, 15 * 60);
  if (!guard.ok) return { ok: false, message: retryMessage(guard) };

  const row = await db.passwordResetToken.findUnique({ where: { token: hashToken(token) }, include: { user: true } });
  if (!row || row.expiresAt < new Date()) {
    return { ok: false, message: "El enlace no es válido o ya venció. Pide uno nuevo." };
  }
  const updated = await setPasswordAndRotateSessions(row.userId, pw);
  await db.passwordResetToken.deleteMany({ where: { userId: row.userId } });
  await createSession(updated);
  redirect(updated.role === Role.ADMIN ? "/admin" : "/cuenta");
}

/* ------------------------------------------------------------------ */
/* Perfil                                                              */
/* ------------------------------------------------------------------ */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(20).regex(/^$|^[+\d\s()-]{8,}$/, "Ingresa un teléfono válido").optional().default(""),
  rut: z
    .string()
    .trim()
    .max(15)
    .optional()
    .default("")
    .refine((v) => !v || validateRut(v), "El RUT no es válido")
    .transform((v) => (v ? formatRut(v) : "")),
  address1: z.string().trim().max(200).optional().default(""),
  address2: z.string().trim().max(120).optional().default(""),
  region: z
    .string()
    .trim()
    .max(10)
    .optional()
    .default("")
    .refine((v) => !v || Boolean(REGION_BY_CODE[v]), "Región inválida"),
  commune: z.string().trim().max(80).optional().default(""),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/cuenta/ingresar?next=/cuenta/perfil");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;
  await db.user.update({
    where: { id: user.id },
    data: {
      name: d.name,
      lastName: d.lastName || null,
      phone: d.phone || null,
      rut: d.rut || null,
      address1: d.address1 || null,
      address2: d.address2 || null,
      region: d.region || null,
      commune: d.commune || null,
      city: d.commune || null,
    },
  });
  revalidatePath("/cuenta/perfil");
  return { ok: true, message: "Datos guardados." };
}

const passwordSchema = z
  .object({ current: z.string().optional().default(""), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/cuenta/ingresar?next=/cuenta/perfil");
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;

  const full = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (full?.passwordHash) {
    const ok = await verifyPassword(d.current, full.passwordHash);
    if (!ok) return { ok: false, field: "current", message: "La contraseña actual no es correcta." };
  }
  const updated = await setPasswordAndRotateSessions(user.id, d.password);
  await createSession(updated); // esta sesión sigue; las demás quedan invalidadas
  return { ok: true, message: "Contraseña actualizada. Se cerraron las sesiones en otros dispositivos." };
}

/* ------------------------------------------------------------------ */
/* Salir                                                               */
/* ------------------------------------------------------------------ */

export async function logout() {
  await destroySession();
  redirect("/");
}
