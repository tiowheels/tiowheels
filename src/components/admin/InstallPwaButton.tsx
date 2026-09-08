"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, MoreVertical, Menu, Smartphone } from "lucide-react";
import { cn } from "@/lib/format";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Browser = "ios" | "samsung" | "chrome" | "other";

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document)) return "ios";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Chrome|CriOS|EdgA/i.test(ua)) return "chrome";
  return "other";
}

/**
 * Botón "Instalar app". Si el navegador ofrece instalación directa (Chrome/Edge Android: beforeinstallprompt),
 * la dispara. Si no, muestra instrucciones según el navegador (Samsung Internet, iOS Safari, Chrome sin evento).
 */
export function InstallPwaButton({ className, variant = "dark", asCard = false }: { className?: string; variant?: "dark" | "light"; asCard?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [browser, setBrowser] = useState<Browser>("other");
  const [standalone, setStandalone] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización con estado externo (hidratación/DOM)
    setStandalone(isStandalone);
    setBrowser(detectBrowser());
    try {
      setDismissed(localStorage.getItem("tw_pwa_banner_dismissed") === "1");
    } catch {}
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
  if (asCard && dismissed) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setDeferred(null);
      return;
    }
    setShowHelp(true);
  }

  function dismissCard() {
    setDismissed(true);
    try {
      localStorage.setItem("tw_pwa_banner_dismissed", "1");
    } catch {}
  }

  const base = variant === "dark" ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-ink-200 bg-white text-ink hover:bg-ink-50";

  return (
    <>
      {asCard ? (
        <div className={cn("relative overflow-hidden rounded-card bg-lime p-4 text-ink shadow-card md:hidden", className)}>
          <button type="button" aria-label="Ocultar" onClick={dismissCard} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full hover:bg-ink/10">
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-lime">
              <Smartphone className="size-6" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold">Instala el panel en tu celular</div>
              <div className="text-xs text-ink-700">Acceso directo a Venta rápida, sin abrir el navegador.</div>
            </div>
          </div>
          <button type="button" onClick={install} className="btn-primary btn-md mt-3 w-full">
            <Download className="size-4" /> Instalar app
          </button>
        </div>
      ) : (
        <button type="button" onClick={install} className={cn("flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition", base, className)}>
          <Download className="size-4 shrink-0" />
          Instalar app
        </button>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-4 sm:items-center" onClick={() => setShowHelp(false)}>
          <div className="card w-full max-w-sm p-6 text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg">{browser === "ios" ? "Instalar en iPhone o iPad" : browser === "samsung" ? "Instalar en Samsung Internet" : "Instalar en tu celular"}</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setShowHelp(false)} className="btn-ghost size-9 !p-0">
                <X className="size-5" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-ink-700">
              {browser === "ios" ? (
                <>
                  <Step n={1}>
                    Abre esta página en <strong>Safari</strong> y toca <strong>Compartir</strong> <Share className="inline size-4 align-text-bottom" />.
                  </Step>
                  <Step n={2}>
                    Elige <strong>“Agregar a inicio”</strong> y confirma.
                  </Step>
                </>
              ) : browser === "samsung" ? (
                <>
                  <Step n={1}>
                    Toca el menú <Menu className="inline size-4 align-text-bottom" /> de Samsung Internet (abajo a la derecha).
                  </Step>
                  <Step n={2}>
                    Elige <strong>“Añadir página a”</strong> y luego <strong>“Pantalla de inicio”</strong>.
                  </Step>
                  <Step n={3}>Si aparece el botón “Instalar” en la barra de dirección, también sirve.</Step>
                </>
              ) : (
                <>
                  <Step n={1}>
                    Toca el menú <MoreVertical className="inline size-4 align-text-bottom" /> de Chrome (arriba a la derecha).
                  </Step>
                  <Step n={2}>
                    Elige <strong>“Instalar app”</strong> o <strong>“Agregar a la pantalla principal”</strong>.
                  </Step>
                  <Step n={3}>Si no aparece la opción, recarga la página una vez y vuelve a abrir el menú.</Step>
                </>
              )}
              <Step n={browser === "ios" ? 3 : 4}>Listo: el panel de Tío Wheels quedará como una app en tu pantalla de inicio.</Step>
            </ol>
            <button type="button" onClick={() => setShowHelp(false)} className="btn-primary btn-md mt-6 w-full">
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold">{n}</span>
      <span>{children}</span>
    </li>
  );
}
