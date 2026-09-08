"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, createSession } from "@/lib/auth";
import { clientIp, rateLimit, retryMessage } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export type LoginState = { error?: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const ip = await clientIp();
  const byIp = rateLimit(`admin-login:ip:${ip}`, 10, 15 * 60);
  const byMail = rateLimit(`admin-login:mail:${parsed.data.email.toLowerCase()}`, 5, 15 * 60);
  if (!byIp.ok) return { error: retryMessage(byIp) };
  if (!byMail.ok) return { error: retryMessage(byMail) };
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user || user.role !== "ADMIN") return { error: "Correo o contraseña incorrectos, o la cuenta no es administradora." };
  await createSession(user);
  redirect("/admin");
}
