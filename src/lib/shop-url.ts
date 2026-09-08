/** Helpers para construir URLs de /tienda (usable en cliente y servidor). */

export type ShopQuery = {
  q?: string;
  cat?: string;
  marca?: string[];
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
  if (next.marca?.length) sp.set("marca", next.marca.join(","));
  if (next.min != null) sp.set("min", String(next.min));
  if (next.max != null) sp.set("max", String(next.max));
  if (next.agotados) sp.set("disp", "todo");
  if (next.orden) sp.set("orden", next.orden);
  if (next.page && next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `/tienda?${s}` : "/tienda";
}

export function toggleBrand(current: ShopQuery, brand: string) {
  const set = new Set(current.marca ?? []);
  if (set.has(brand)) set.delete(brand);
  else set.add(brand);
  return buildShopUrl(current, { marca: set.size ? [...set] : undefined });
}

/** Cantidad de filtros activos (sin contar orden/página). */
export function countActiveFilters(f: ShopQuery) {
  let n = 0;
  if (f.q) n++;
  if (f.cat) n++;
  n += f.marca?.length ?? 0;
  if (f.min != null || f.max != null) n++;
  if (f.agotados) n++;
  return n;
}
