
import nodemailer from "nodemailer";
import { SITE } from "./site";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
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
