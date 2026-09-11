
import nodemailer from "nodemailer";
import { SITE } from "./site";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function smtpPort() {
  return Number(process.env.SMTP_PORT || 587);
}

function transport() {
  const port = smtpPort();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Sin estos topes, un puerto bloqueado deja el envío colgado dos minutos
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

/** Comprueba de verdad la conexión con el servidor de correo (para el panel de ajustes). */
export async function mailStatus(): Promise<{ ok: boolean; detail: string }> {
  if (!mailConfigured()) return { ok: false, detail: "Sin SMTP: los correos quedan solo en el registro del servidor" };
  const donde = `${process.env.SMTP_HOST}:${smtpPort()}`;
  try {
    await transport().verify();
    return { ok: true, detail: `Conectado a ${donde}, envía desde ${process.env.SMTP_FROM || process.env.SMTP_USER}` };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    const causa = e.code === "ETIMEDOUT" || e.code === "ESOCKET" ? "el servidor no alcanza ese puerto (suele estar bloqueado)" : e.code === "EAUTH" ? "usuario o contraseña rechazados" : e.message ?? String(err);
    return { ok: false, detail: `No se pudo conectar a ${donde}: ${causa}` };
  }
}

/** Envía un correo si SMTP está configurado; si no, lo registra en consola y no falla. */
export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  if (!mailConfigured()) {
    console.info(`[mail] SMTP no configurado. Correo omitido → ${opts.to}: ${opts.subject}`);
    return { skipped: true as const };
  }
  try {
    await transport().sendMail({
      from: process.env.SMTP_FROM || `${SITE.name} <info@tiowheels.cl>`,
      // Las respuestas de los clientes llegan a la casilla de atención, no a la de envío
      replyTo: process.env.SMTP_REPLY_TO || SITE.email,
      ...opts,
    });
    return { skipped: false as const };
  } catch (err) {
    console.error("[mail] error enviando correo", err);
    return { skipped: false as const, error: String(err) };
  }
}
