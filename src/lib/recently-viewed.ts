/** Historial "vistos recientemente" en localStorage (solo ids de producto). Solo cliente. */

export const RECENT_KEY = "tw_recent_v1";
export const RECENT_MAX = 8;

export function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/** Agrega `id` al inicio del historial (sin duplicados) y devuelve la lista previa sin ese id. */
export function pushRecentId(id: string): string[] {
  const prev = getRecentIds().filter((x) => x !== id);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, RECENT_MAX)));
  } catch {}
  return prev;
}
