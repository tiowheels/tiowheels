"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";
import { clientIp, rateLimit, retryMessage } from "@/lib/rate-limit";

export async function subscribeNewsletter(_prev: unknown, formData: FormData) {
  if (String(formData.get("website") ?? "")) return { ok: true, message: "¡Listo!" }; // honeypot
  const limit = rateLimit(`newsletter:${await clientIp()}`, 5, 60 * 60);
  if (!limit.ok) return { ok: false, message: retryMessage(limit) };
  const email = z.string().max(120).email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, message: "Ingresa un email válido." };
  const key = "newsletter";
  const current = (await db.setting.findUnique({ where: { key } }))?.value as string[] | undefined;
  const list = new Set(current ?? []);
  list.add(email.data);
  await db.setting.upsert({ where: { key }, create: { key, value: [...list] }, update: { value: [...list] } });
  return { ok: true, message: "¡Listo! Te avisaremos de las novedades." };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(80, "Nombre demasiado largo"),
  email: z.string().trim().max(120).email("Email inválido"),
  message: z.string().trim().min(5, "Cuéntanos en qué te ayudamos").max(2000, "El mensaje es demasiado largo (máx. 2000 caracteres)"),
  phone: z.string().trim().max(20).optional(),
  website: z.string().max(0).optional(), // honeypot: los bots lo rellenan
});

export async function sendContact(_prev: unknown, formData: FormData) {
  const limit = rateLimit(`contact:${await clientIp()}`, 3, 60 * 60);
  if (!limit.ok) return { ok: false, message: retryMessage(limit) };
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, message: "Mensaje enviado." };
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el formulario." };
  }
  const { name, email, message, phone } = parsed.data;
  await db.contactMessage.create({ data: { name, email, phone: phone || null, message } });
  await sendMail({
    to: SITE.email,
    subject: `Contacto web: ${name}`,
    html: `<p><b>${name}</b> (${email}${phone ? ", " + phone : ""}) escribió:</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
    text: `${name} (${email}) escribió:\n\n${message}`,
  });
  return { ok: true, message: "Mensaje enviado. Te responderemos a la brevedad." };
}
