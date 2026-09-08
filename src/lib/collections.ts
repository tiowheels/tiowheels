/** Lógica compartida para elegir la "colección" (categoría raíz destacable) de un producto. */

export type CollectionCategory = { slug: string; name: string; parentId: string | null };

/** Categorías "de origen": no aportan como etiqueta de colección (ya se muestra la marca). */
export const ORIGIN_CATEGORIES = new Set(["americanos", "europeos", "japoneses", "camionetas-y-jeeps"]);

/** Colecciones que vale la pena destacar primero. */
export const PRIORITY_COLLECTIONS = [
  "super-treasure-hunt",
  "treasure-hunt",
  "rlc",
  "hotwheels-premium",
  "ediciones-limitadas",
  "90-tarjeta-azul",
  "fast-and-furious",
  "final-run",
  "zamac",
  "real-raiders",
  "matchbox",
  "mini-gt",
  "m2",
  "greenlight",
  "auto-world",
  "johnny-lighting",
  "jada",
  "tarmac",
];

/** Devuelve la categoría raíz (no de origen) más relevante, o null. */
export function collectionOf<T extends CollectionCategory>(cats: T[] | null | undefined): T | null {
  if (!cats?.length) return null;
  const roots = cats.filter((c) => !c.parentId && !ORIGIN_CATEGORIES.has(c.slug) && c.slug !== "uncategorized");
  if (!roots.length) return null;
  const ranked = [...roots].sort((a, b) => {
    const ia = PRIORITY_COLLECTIONS.indexOf(a.slug);
    const ib = PRIORITY_COLLECTIONS.indexOf(b.slug);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return ranked[0];
}
