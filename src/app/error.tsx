"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { WrenchIcon, GarageIcon } from "@/components/ui/AutoIcons";
import { whatsappLink } from "@/lib/site";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-ink-100">
        <div className="container-x flex h-16 items-center">
          <Link href="/" aria-label="Tío Wheels, ir al inicio">
            <img src="/brand/logo.png" alt="Tío Wheels" className="h-9 w-auto" />
          </Link>
        </div>
      </header>
      <main className="container-x flex flex-1 flex-col items-center justify-center py-16 text-center md:py-24">
        <span className="flex size-20 items-center justify-center rounded-full bg-lime/20 text-lime-700">
          <WrenchIcon className="size-10" />
        </span>
        <span className="mt-6 rounded-full bg-ink px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-lime">Parada en boxes</span>
        <h1 className="mt-4 text-3xl sm:text-4xl">Algo salió mal</h1>
        <p className="mt-3 max-w-md text-ink-500">
          Tuvimos un problema al cargar esta página. Prueba de nuevo en unos segundos; si sigue fallando, escríbenos por WhatsApp y lo revisamos al tiro.
        </p>
        {error.digest ? <p className="mt-2 text-xs text-ink-400">Código: {error.digest}</p> : null}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn-lime btn-md">
            <RotateCcw className="size-4" aria-hidden /> Reintentar
          </button>
          <Link href="/" className="btn-outline btn-md">
            <GarageIcon className="size-4" /> Ir al inicio
          </Link>
          <a href={whatsappLink("Hola Tío Wheels, la web me mostró un error")} target="_blank" rel="noreferrer" className="btn-ghost btn-md">
            Avisar por WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
