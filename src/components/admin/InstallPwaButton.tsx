"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { cn } from "@/lib/format";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Botón "Instalar app": captura beforeinstallprompt (Android/Chrome/Edge).
 * En iOS Safari no existe el evento: muestra instrucciones (Compartir → Agregar a inicio).
 */
export function InstallPwaButton({ className, variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización con estado externo (hidratación/DOM)
    setStandalone(isStandalone);
    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIsIos(ios);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;
  if (!deferred && !isIos) return null;

  const base = variant === "dark" ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-ink-200 bg-white text-ink hover:bg-ink-50";

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setDeferred(null);
      return;
    }
    setShowIosHelp(true);
  }

  return (
    <>
      <button type="button" onClick={install} className={cn("flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition", base, className)}>
        <Download className="size-4 shrink-0" />
        Instalar app
      </button>
      {showIosHelp && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-4 sm:items-center" onClick={() => setShowIosHelp(false)}>
          <div className="card w-full max-w-sm p-6 text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg">Instalar en iPhone o iPad</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setShowIosHelp(false)} className="btn-ghost size-9 !p-0">
                <X className="size-5" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-ink-700">
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold">1</span>
                <span>
                  Abre esta página en <strong>Safari</strong> y toca el botón <strong>Compartir</strong> <Share className="inline size-4 align-text-bottom" />.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold">2</span>
                <span>
                  Elige <strong>“Agregar a inicio”</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold">3</span>
                <span>Listo: el panel de Tío Wheels quedará como una app en tu pantalla de inicio.</span>
              </li>
            </ol>
            <button type="button" onClick={() => setShowIosHelp(false)} className="btn-primary btn-md mt-6 w-full">
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
