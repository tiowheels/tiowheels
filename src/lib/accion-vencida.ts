"use client";

/**
 * Cuando publicamos una versión nueva, las pestañas que quedaron abiertas apuntan
 * a una acción de servidor que ya no existe y el envío falla con
 * "Failed to find Server Action". No es un error del usuario: basta con recargar.
 */
export function esAccionVencida(err: unknown) {
  const e = err as { message?: string; digest?: string };
  const texto = `${e?.message ?? String(err)} ${e?.digest ?? ""}`;
  return /Failed to find Server Action|older or newer deployment|NEXT_REDIRECT_INVALID/i.test(texto);
}

export const AVISO_ACCION_VENCIDA = "El panel se actualizó mientras trabajabas. Recargamos la página para seguir; no pierdes lo que llevas.";

/** Recarga la pestaña para que tome la versión nueva. */
export function recargarPorActualizacion(demoraMs = 1800) {
  setTimeout(() => window.location.reload(), demoraMs);
}
