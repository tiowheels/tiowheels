/** Helpers para construir URLs de /tienda (usable en cliente y servidor). */

export type ShopQuery = {
  q?: string;
  cat?: string;
  min?: number;
  max?: number;
  agotados?: boolean;
  orden?: string;
  page?: number;
};

/**
 * Devuelve la URL de /tienda aplicando `patch` sobre `current`.
 * - Claves con `undefined` se eliminan.
 * - Cualquier cambio de filtro resetea la página, salvo que `page` venga en el patch.
 */
export function buildShopUrl(current: ShopQuery, patch: Partial<ShopQuery> = {}) {
  const next: ShopQuery = { ...current, ...patch };
  if (!("page" in patch)) next.page = undefined;
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.cat) sp.set("cat", next.cat);
  if (next.min != null) sp.set("min", String(next.min));
  if (next.max != null) sp.set("max", String(next.max));
  if (next.agotados) sp.set("disp", "todo");
  if (next.orden) sp.set("orden", next.orden);
  if (next.page && next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `/tienda?${s}` : "/tienda";
}


/** Cantidad de filtros activos (sin contar orden/página). */
export function countActiveFilters(f: ShopQuery) {
  let n = 0;
  if (f.q) n++;
  if (f.cat) n++;
  if (f.min != null || f.max != null) n++;
  if (f.agotados) n++;
  return n;
}
