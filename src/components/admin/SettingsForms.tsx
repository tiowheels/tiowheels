"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, KeyRound, Copy, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/format";
import { saveStoreSettings, changeAdminPassword, removeNewsletterEmail, type ActionResult } from "@/app/admin/(panel)/ajustes/actions";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? "Listo" } : { ok: false, text: r.error });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  }
  const Msg = msg ? <p className={cn("rounded-xl px-4 py-2.5 text-sm font-medium", msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{msg.text}</p> : null;
  return { pending, run, Msg };
}

export function StoreSettingsForm({ initial }: { initial: { pickupAddress: string; shippingNote: string; transferEnabled: boolean; transferDetails: string } }) {
  const [v, setV] = useState(initial);
  const { pending, run, Msg } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveStoreSettings(v));
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="pickupAddress" className="label">
          Dirección / instrucciones de retiro
        </label>
        <input id="pickupAddress" value={v.pickupAddress} onChange={(e) => setV({ ...v, pickupAddress: e.target.value })} className="input" placeholder="Ej: Coordinar retiro por WhatsApp" />
      </div>
      <div>
        <label htmlFor="shippingNote" className="label">
          Nota de envío (se muestra en el checkout)
        </label>
        <textarea id="shippingNote" rows={3} value={v.shippingNote} onChange={(e) => setV({ ...v, shippingNote: e.target.value })} className="input h-auto min-h-20 resize-y py-2.5" />
      </div>
      <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-ink-200 px-4 text-sm font-semibold">
        <input type="checkbox" checked={v.transferEnabled} onChange={(e) => setV({ ...v, transferEnabled: e.target.checked })} className="size-5 accent-lime-600" />
        Aceptar pago por transferencia
      </label>
      <div>
        <label htmlFor="transferDetails" className="label">
          Datos para transferir (una línea por dato)
        </label>
        <textarea id="transferDetails" rows={6} value={v.transferDetails} onChange={(e) => setV({ ...v, transferDetails: e.target.value })} className="input h-auto min-h-36 resize-y py-2.5 font-mono text-sm" placeholder={"Banco: …\nTipo de cuenta: …\nN° de cuenta: …\nNombre: …\nRUT: …\nEmail: …"} />
      </div>
      {Msg}
      <button type="submit" disabled={pending} className="btn-primary btn-md">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar ajustes
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const { pending, run, Msg } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => changeAdminPassword(v),
          () => setV({ current: "", next: "", confirm: "" }),
        );
      }}
      className="space-y-3"
    >
      <div>
        <label htmlFor="current" className="label">
          Contraseña actual
        </label>
        <input id="current" type="password" autoComplete="current-password" required value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="next" className="label">
            Nueva contraseña
          </label>
          <input id="next" type="password" autoComplete="new-password" required minLength={8} value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} className="input" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">
            Repetir nueva contraseña
          </label>
          <input id="confirm" type="password" autoComplete="new-password" required minLength={8} value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} className="input" />
        </div>
      </div>
      {Msg}
      <button type="submit" disabled={pending} className="btn-outline btn-md">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Cambiar contraseña
      </button>
    </form>
  );
}

export function NewsletterList({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  const { pending, run, Msg } = useAction();
  async function copy() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sin permisos de portapapeles */
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-ink-600">
          {emails.length} {emails.length === 1 ? "suscriptor" : "suscriptores"}
        </span>
        <button type="button" onClick={copy} disabled={emails.length === 0} className="btn-outline btn-sm">
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />} {copied ? "Copiado" : "Copiar todos"}
        </button>
      </div>
      {Msg}
      {emails.length === 0 ? (
        <p className="rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500">Todavía nadie se ha suscrito desde la tienda.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-100">
          {emails.map((e) => (
            <li key={e} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="truncate">{e}</span>
              <button
                type="button"
                aria-label="Quitar"
                disabled={pending}
                onClick={() => {
                  if (confirm(`¿Quitar a ${e} de la lista?`)) run(() => removeNewsletterEmail({ email: e }));
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
