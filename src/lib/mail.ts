
import nodemailer from "nodemailer";
import { SITE } from "./site";

/** Relevo por HTTPS en el hosting (correo.php): se usa cuando los puertos de correo están bloqueados. */
function relayConfigured() {
  return Boolean(process.env.MAIL_RELAY_URL && process.env.MAIL_RELAY_SECRET);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function mailConfigured() {
  return relayConfigured() || smtpConfigured();
}

type Correo = { to: string; subject: string; html: string; text?: string };

/** Envía a través de correo.php, que despacha desde el propio servidor del dominio. */
async function enviarPorRelay(opts: Correo) {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), 20_000);
  try {
    const r = await fetch(process.env.MAIL_RELAY_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tw-Secreto": process.env.MAIL_RELAY_SECRET! },
      body: JSON.stringify({ ...opts, replyTo: process.env.SMTP_REPLY_TO || SITE.email }),
      signal: control.signal,
      cache: "no-store",
    });
    const cuerpo = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!r.ok || !cuerpo.ok) throw new Error(cuerpo.error ?? `HTTP ${r.status}`);
  } finally {
    clearTimeout(corte);
  }
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
  if (relayConfigured()) {
    const url = process.env.MAIL_RELAY_URL!;
    try {
      const control = new AbortController();
      const corte = setTimeout(() => control.abort(), 12_000);
      const r = await fetch(url, { headers: { "X-Tw-Secreto": process.env.MAIL_RELAY_SECRET! }, signal: control.signal, cache: "no-store" });
      clearTimeout(corte);
      const cuerpo = (await r.json().catch(() => ({}))) as { ok?: boolean; listo?: boolean; error?: string; remitente?: string };
      if (r.ok && cuerpo.listo) return { ok: true, detail: `Enviando desde el hosting (${cuerpo.remitente ?? "info@tiowheels.cl"}) vía ${new URL(url).host}` };
      return { ok: false, detail: `El relevo respondió ${r.status}: ${cuerpo.error ?? "respuesta inesperada"}` };
    } catch (err) {
      return { ok: false, detail: `No se pudo hablar con el relevo ${url}: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
  if (!mailConfigured()) return { ok: false, detail: "Sin correo configurado: los envíos quedan solo en el registro del servidor" };
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

/** Envía un correo por el relevo del hosting o por SMTP; si no hay ninguno, solo lo registra. */
export async function sendMail(opts: Correo) {
  if (!mailConfigured()) {
    console.info(`[mail] sin correo configurado. Omitido → ${opts.to}: ${opts.subject}`);
    return { skipped: true as const };
  }
  if (relayConfigured()) {
    try {
      await enviarPorRelay(opts);
      return { skipped: false as const };
    } catch (err) {
      console.error("[mail] el relevo falló", err);
      if (!smtpConfigured()) return { skipped: false as const, error: String(err) };
      // si el relevo se cae, se intenta igual por SMTP
    }
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
