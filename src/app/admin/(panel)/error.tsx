"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { esAccionVencida, AVISO_ACCION_VENCIDA, recargarPorActualizacion } from "@/lib/accion-vencida";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const vencida = esAccionVencida(error);

  useEffect(() => {
    console.error("[admin]", error);
    // Publicamos una versión nueva mientras la pestaña estaba abierta: basta recargar
    if (vencida) recargarPorActualizacion(2200);
  }, [error, vencida]);

  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-flame/15 text-flame">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="mt-4 text-xl">{vencida ? "El panel se actualizó" : "Algo salió mal"}</h1>
      <p className="mt-2 text-sm text-ink-500">
        {vencida ? AVISO_ACCION_VENCIDA : "No pudimos completar la acción. Vuelve a intentarlo; si sigue igual, avísanos."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => window.location.reload()} className="btn-primary btn-md">
          <RotateCcw className="size-4" /> Recargar
        </button>
        {!vencida && (
          <button type="button" onClick={reset} className="btn-outline btn-md">
            Reintentar
          </button>
        )}
      </div>
      {error.digest && <p className="mt-4 text-[11px] text-ink-400">Código: {error.digest}</p>}
    </div>
  );
}
