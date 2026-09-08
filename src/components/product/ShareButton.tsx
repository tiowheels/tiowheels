"use client";

import { useEffect, useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/format";

/** Compartir en móvil (navigator.share) o copiar el enlace en escritorio, con aviso "Enlace copiado". */
export function ShareButton({ url, title, text, className }: { url: string; title: string; text?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    const nav = navigator;
    const mobile = window.matchMedia("(hover: none)").matches;
    if (mobile && typeof nav.share === "function" && (!nav.canShare || nav.canShare({ url }))) {
      try {
        await nav.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
      }
    }
    try {
      await nav.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  }

  return (
    <>
      <button type="button" onClick={share} className={cn("btn-ghost btn-sm -mr-2 gap-1.5 text-ink-500 hover:text-ink", className)} aria-label={`Compartir ${title}`}>
        {copied ? <Check className="size-4 text-lime-700" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
        <span className="text-[13px]">{copied ? "Copiado" : "Compartir"}</span>
      </button>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 transition-all duration-300 md:bottom-8",
          copied ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        {copied ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-pop">
            <Check className="size-4 text-lime" aria-hidden /> Enlace copiado
          </span>
        ) : null}
      </div>
    </>
  );
}
