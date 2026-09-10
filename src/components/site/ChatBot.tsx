"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Send, Loader2, ArrowRight, MessageCircle } from "lucide-react";
import { cn, formatCLP } from "@/lib/format";
import type { ChatProduct, ChatReply } from "@/lib/chat";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { SITE, whatsappLink } from "@/lib/site";

type Mensaje = { de: "tio" | "cliente"; texto: string; productos?: ChatProduct[]; link?: ChatReply["link"]; sugerencias?: string[] };

const BIENVENIDA: Mensaje = {
  de: "tio",
  texto: "¡Hola! Soy el Tío Wheels 👋 Dime qué auto buscas (una marca, un modelo o una colección) y te muestro lo que tengo con stock.",
  sugerencias: ["Mercedes", "Nissan Skyline", "Ver Hot Wheels premium", "¿Cómo son los envíos?"],
};

/** Convierte **negrita** en <strong> sin permitir HTML del servidor. */
function Texto({ children }: { children: string }) {
  const partes = children.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ChatBot() {
  const reduce = useReducedMotion();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([BIENVENIDA]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // El rótulo aparece apenas carga la página, salvo que el visitante lo haya cerrado antes
  useEffect(() => {
    let oculto = false;
    try {
      oculto = localStorage.getItem("tw_chat_aviso") === "0";
    } catch {}
    if (oculto) return;
    const t = setTimeout(() => setAviso(true), 600);
    return () => clearTimeout(t);
  }, []);

  function ocultarAviso() {
    setAviso(false);
    try {
      localStorage.setItem("tw_chat_aviso", "0");
    } catch {}
  }

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, abierto, cargando]);

  function abrir() {
    setAbierto(true);
    setTimeout(() => inputRef.current?.focus(), 250);
  }

  async function enviar(mensaje: string) {
    const limpio = mensaje.trim();
    if (!limpio || cargando) return;
    setMensajes((m) => [...m, { de: "cliente", texto: limpio }]);
    setTexto("");
    setCargando(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensaje: limpio }) });
      const data = (await r.json()) as ChatReply;
      setMensajes((m) => [...m, { de: "tio", texto: data.text, productos: data.products, link: data.link, sugerencias: data.suggestions }]);
    } catch {
      setMensajes((m) => [...m, { de: "tio", texto: "Se me cayó la conexión. Intenta de nuevo o escríbeme por WhatsApp." }]);
    }
    setCargando(false);
  }

  return (
    <>
      {/* Botón flotante: se acompaña de un rótulo para que se note que es un chat y no WhatsApp */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 max-sm:bottom-4 max-sm:right-4">
        {!abierto && aviso && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-[15rem] rounded-2xl rounded-br-sm bg-white py-2 pl-3 pr-7 shadow-pop"
          >
            <button type="button" onClick={abrir} className="flex items-center gap-1.5 text-left text-[13px] font-bold text-ink">
              <MessageCircle className="size-4 shrink-0 text-lime-700" />
              Chatea con el Tío Wheels
            </button>
            <button type="button" onClick={ocultarAviso} aria-label="Ocultar el mensaje" className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink">
              <X className="size-3" />
            </button>
          </motion.div>
        )}
        <div className="flex items-center gap-2">
          <a
            href={whatsappLink("Hola Tío Wheels, tengo una consulta")}
            target="_blank"
            rel="noreferrer"
            aria-label="Escríbenos por WhatsApp"
            className="flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop transition hover:scale-105"
          >
            <WhatsAppIcon className="size-6" />
          </a>
          <button
            type="button"
            onClick={() => (abierto ? setAbierto(false) : abrir())}
            aria-label={abierto ? "Cerrar el chat" : "Abrir el chat con Tío Wheels"}
            className="relative flex size-16 items-center justify-center rounded-full bg-lime shadow-pop ring-2 ring-white transition hover:scale-105 active:scale-95"
          >
            {abierto ? (
              <X className="size-7 text-ink" />
            ) : (
              <>
                <img src="/brand/tio.png" alt="" className="size-14 object-contain drop-shadow" />
                <span className="absolute -bottom-1.5 rounded-full bg-ink px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-lime shadow">Chat</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {abierto && (
          <motion.aside
            role="dialog"
            aria-label="Chat con Tío Wheels"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-5 z-50 flex h-[min(32rem,calc(100dvh-8rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-card bg-white shadow-pop max-sm:bottom-24 max-sm:right-4"
          >
            <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
              <img src="/brand/tio.png" alt="" className="size-10 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">Tío Wheels</p>
                <p className="flex items-center gap-1.5 text-[11px] text-ink-300">
                  <span className="size-1.5 rounded-full bg-lime" /> El Tío Wheels que siempre sabe lo que hace
                </p>
              </div>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="flex size-9 items-center justify-center rounded-full hover:bg-white/10">
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50/60 px-3 py-3">
              {mensajes.map((m, i) => (
                <div key={i} className={cn("flex", m.de === "cliente" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[92%] space-y-2", m.de === "cliente" && "max-w-[85%]")}>
                    <div className={cn("rounded-2xl px-3 py-2 text-[13px] leading-relaxed", m.de === "cliente" ? "rounded-br-sm bg-ink text-white" : "rounded-bl-sm bg-white text-ink shadow-sm")}>
                      <Texto>{m.texto}</Texto>
                    </div>

                    {m.productos && m.productos.length > 0 && (
                      <ul className="space-y-1.5">
                        {m.productos.map((p) => (
                          <li key={p.slug}>
                            <Link href={`/producto/${p.slug}`} onClick={() => setAbierto(false)} className="flex items-center gap-2.5 rounded-xl bg-white p-2 shadow-sm transition hover:shadow-card">
                              <img src={p.image} alt="" className="size-12 shrink-0 rounded-lg bg-ink-50 object-contain" loading="lazy" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-ink">{p.name}</span>
                                <span className="block text-[11px] text-ink-500">
                                  {p.brand ?? "Hot Wheels"} · <b className="text-ink">{formatCLP(p.price)}</b>
                                  {p.stock === 1 ? " · última unidad" : ""}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    {m.link &&
                      (m.link.href.startsWith("http") ? (
                        <a href={m.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1.5 text-[12px] font-bold text-ink">
                          {m.link.label} <ArrowRight className="size-3.5" />
                        </a>
                      ) : (
                        <Link href={m.link.href} onClick={() => setAbierto(false)} className="inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1.5 text-[12px] font-bold text-ink">
                          {m.link.label} <ArrowRight className="size-3.5" />
                        </Link>
                      ))}

                    {m.sugerencias && m.sugerencias.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.sugerencias.map((s) => (
                          <button key={s} type="button" onClick={() => enviar(s)} className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] font-medium text-ink-700 transition hover:border-ink hover:bg-ink hover:text-white">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {cargando && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[13px] text-ink-500 shadow-sm">
                    <Loader2 className="size-3.5 animate-spin" /> Buscando…
                  </div>
                </div>
              )}
              <div ref={finRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(texto);
              }}
              className="flex items-center gap-2 border-t border-ink-100 bg-white p-2.5"
            >
              <input
                ref={inputRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ej: Mercedes, Skyline, premium…"
                aria-label="Escribe tu consulta"
                maxLength={200}
                enterKeyHint="send"
                className="h-11 min-w-0 flex-1 rounded-full border border-ink-200 bg-white px-4 text-[14px] focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime/60"
              />
              <button type="submit" disabled={!texto.trim() || cargando} aria-label="Enviar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-lime hover:text-ink disabled:bg-ink-200">
                <Send className="size-5" />
              </button>
            </form>
            <p className="bg-white pb-2 text-center text-[10px] text-ink-400">
              ¿Prefieres hablar con una persona?{" "}
              <a href={whatsappLink()} target="_blank" rel="noreferrer" className="font-semibold text-ink-600 underline">
                WhatsApp {SITE.phone}
              </a>
            </p>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
