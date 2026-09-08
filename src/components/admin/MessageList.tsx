"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ChevronDown, Loader2, Mail, MailOpen, MessageCircle, Trash2 } from "lucide-react";
import { cn, formatDateTime } from "@/lib/format";
import { deleteMessage, markAllMessagesRead, setMessageRead, type MessageActionResult } from "@/app/admin/(panel)/mensajes/actions";
import { whatsappTo } from "./labels";

export type MessageRow = { id: string; name: string; email: string; phone: string | null; message: string; read: boolean; createdAt: string };

const REPLY_SUBJECT = "Re: tu mensaje a Tío Wheels";

export function MessageList({ messages }: { messages: MessageRow[] }) {
  return (
    <ul className="space-y-2">
      {messages.map((m) => (
        <MessageCard key={m.id} m={m} />
      ))}
    </ul>
  );
}

function MessageCard({ m }: { m: MessageRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<MessageActionResult>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    // Al abrir un mensaje no leído lo marcamos leído automáticamente.
    if (next && !m.read) run(() => setMessageRead({ id: m.id, read: true }));
  }

  const wa = whatsappTo(m.phone, `Hola ${m.name.split(" ")[0]}, te escribimos de Tío Wheels por el mensaje que nos dejaste en la web.`);
  const mailto = `mailto:${m.email}?subject=${encodeURIComponent(REPLY_SUBJECT)}&body=${encodeURIComponent(`Hola ${m.name.split(" ")[0]},\n\n\n\n---\nTu mensaje:\n${m.message}`)}`;
  const preview = m.message.replace(/\s+/g, " ").trim();

  return (
    <li className={cn("card overflow-hidden transition", !m.read && "border-l-4 border-lime")}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", m.read ? "bg-ink-50 text-ink-400" : "bg-lime text-ink")}>
          {m.read ? <MailOpen className="size-4" /> : <Mail className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className={cn("truncate text-sm", m.read ? "font-semibold text-ink-700" : "font-black")}>{m.name}</span>
            <span className="text-xs text-ink-500">{formatDateTime(m.createdAt)}</span>
          </span>
          <span className="block truncate text-xs text-ink-500">
            {m.email}
            {m.phone ? ` · ${m.phone}` : ""}
          </span>
          {!open && <span className={cn("mt-1 line-clamp-2 block text-sm", m.read ? "text-ink-600" : "text-ink")}>{preview}</span>}
        </span>
        <ChevronDown className={cn("mt-1 size-5 shrink-0 text-ink-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-ink-100 px-4 pb-4 pt-3 sm:pl-16">
          <p className="whitespace-pre-line text-sm leading-relaxed">{m.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={mailto} className="btn-primary btn-sm">
              <Mail className="size-4" /> Responder por email
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="btn-outline btn-sm">
                <MessageCircle className="size-4 text-success" /> WhatsApp
              </a>
            )}
            <button type="button" disabled={pending} onClick={() => run(() => setMessageRead({ id: m.id, read: !m.read }))} className="btn-outline btn-sm">
              {pending ? <Loader2 className="size-4 animate-spin" /> : m.read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
              {m.read ? "Marcar no leído" : "Marcar leído"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm(`¿Eliminar el mensaje de ${m.name}? Esta acción no se puede deshacer.`)) run(() => deleteMessage({ id: m.id }));
              }}
              className="btn-ghost btn-sm text-danger"
            >
              <Trash2 className="size-4" /> Eliminar
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
        </div>
      )}
    </li>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllMessagesRead();
          router.refresh();
        })
      }
      className="btn-outline btn-md"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />} Marcar todos como leídos
    </button>
  );
}
