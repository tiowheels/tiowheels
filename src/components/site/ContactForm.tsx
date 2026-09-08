"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send, LoaderCircle, CircleCheck } from "lucide-react";
import { sendContact } from "@/app/(site)/actions";
import { cn } from "@/lib/format";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="card p-6 sm:p-8" aria-describedby="contact-status">
      {/* Honeypot: invisible para personas; los bots lo rellenan y el envío se descarta */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">
            Nombre
          </label>
          <input id="c-name" name="name" required minLength={2} autoComplete="name" placeholder="Tu nombre" className="input" />
        </div>
        <div>
          <label htmlFor="c-email" className="label">
            Email
          </label>
          <input id="c-email" name="email" type="email" required autoComplete="email" placeholder="tu@email.cl" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="c-phone" className="label">
            Teléfono <span className="font-medium text-ink-400">(opcional)</span>
          </label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+56 9 1234 5678" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="c-message" className="label">
            Mensaje
          </label>
          <textarea id="c-message" name="message" required minLength={5} rows={5} placeholder="Cuéntanos qué modelo buscas o en qué te ayudamos" className="input h-auto min-h-32 resize-y py-3" />
        </div>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="contact-status" role="status" aria-live="polite" className={cn("flex items-center gap-1.5 text-sm font-semibold", state?.ok ? "text-success" : "text-danger")}>
          {state?.message ? (
            <>
              {state.ok ? <CircleCheck className="size-4" aria-hidden /> : null}
              {state.message}
            </>
          ) : null}
        </p>
        <button type="submit" disabled={pending} className="btn-primary btn-lg sm:shrink-0">
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {pending ? "Enviando…" : "Enviar mensaje"}
        </button>
      </div>
    </form>
  );
}
