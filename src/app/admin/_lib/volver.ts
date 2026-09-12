/**
 * Guarda la búsqueda del listado para que el botón de atrás vuelva ahí mismo
 * y no al inicio. Se manda como un solo parámetro `volver` ya codificado.
 */
export function paramVolver(filtros: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) {
    const valor = v == null ? "" : String(v);
    if (valor) sp.set(k, valor);
  }
  const qs = sp.toString();
  return qs ? `?volver=${encodeURIComponent(qs)}` : "";
}

/** Reconstruye la dirección del listado. Solo acepta texto de query, nunca otra URL. */
export function hrefVolver(base: string, raw: string | string[] | undefined) {
  const valor = Array.isArray(raw) ? raw[0] : raw;
  if (!valor) return null;
  const limpio = valor.replace(/^\?+/, "");
  if (limpio.length > 500 || /[^A-Za-z0-9_\-.~%=&+,:]/.test(limpio)) return null;
  return `${base}?${limpio}`;
}
