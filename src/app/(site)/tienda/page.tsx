import type { Metadata } from "next";
import { Suspense } from "react";
import { parseFilters, searchProducts, getCategoryTree, getCategoryBySlug, getTopBrands, SORT_OPTIONS } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ActiveFilters } from "@/components/shop/ActiveFilters";
import { FilterPanel } from "@/components/shop/FilterPanel";
import { FilterDrawer } from "@/components/shop/FilterDrawer";
import { SortSelect } from "@/components/shop/SortSelect";
import { Pagination } from "@/components/shop/Pagination";
import { SubcategoryChips } from "@/components/shop/SubcategoryChips";
import { EmptyState } from "@/components/shop/EmptyState";
import type { ShopCategoryNode } from "@/components/shop/types";
import type { ShopQuery } from "@/lib/shop-url";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function titleFor(filters: ShopQuery, catName: string | null) {
  if (filters.q) return `Resultados para “${filters.q}”`;
  if (filters.cat) return catName ?? "Categoría";
  if (filters.marca?.length) return filters.marca.join(" · ");
  return "Tienda";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  const cat = filters.cat ? await getCategoryBySlug(filters.cat) : null;
  const title = titleFor(filters, cat?.name ?? null);
  const parts = [title];
  if (filters.cat && filters.marca?.length) parts.push(filters.marca.join(", "));
  if (filters.page && filters.page > 1) parts.push(`Página ${filters.page}`);
  const description = cat?.description || (filters.q ? `Autos a escala que coinciden con “${filters.q}”. Hot Wheels, Matchbox y más, con envíos a todo Chile.` : "Explora todo el catálogo de Tío Wheels: Hot Wheels básicos, premium, Treasure Hunt, Matchbox y más. Filtra por categoría, marca y precio.");
  return {
    title: parts.join(" · "),
    description,
    robots: filters.q || filters.marca?.length || filters.min != null || filters.max != null ? { index: false, follow: true } : undefined,
    alternates: filters.cat && !filters.q ? { canonical: `/tienda?cat=${filters.cat}` } : { canonical: "/tienda" },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const [result, rawTree, category, topBrands] = await Promise.all([searchProducts(filters), getCategoryTree(), filters.cat ? getCategoryBySlug(filters.cat) : null, getTopBrands(10)]);

  const tree: ShopCategoryNode[] = rawTree.map((r) => ({
    slug: r.slug,
    name: r.name,
    count: r.count,
    children: r.children.map((c) => ({ slug: c.slug, name: c.name, count: c.count, children: [] })),
  }));

  // Nodo actual y su padre (para chips de subcategorías).
  let current: ShopCategoryNode | null = null;
  let parent: ShopCategoryNode | null = null;
  if (filters.cat) {
    for (const r of tree) {
      if (r.slug === filters.cat) current = r;
      const k = r.children.find((c) => c.slug === filters.cat);
      if (k) {
        current = k;
        parent = r;
      }
    }
  }

  const catName = category?.name ?? current?.name ?? null;
  const title = titleFor(filters, catName);
  const { items, total, page, pages, facets } = result;
  const from = total ? (page - 1) * result.perPage + 1 : 0;
  const to = Math.min(total, page * result.perPage);

  const hasActiveFilters = Boolean(filters.q || filters.cat || filters.marca?.length || filters.min != null || filters.max != null || filters.agotados);
  const panelProps = { filters, tree, brands: facets.brands, priceMin: facets.priceMin, priceMax: facets.priceMax, sortOptions: SORT_OPTIONS };

  return (
    <div className="pb-16">
      {/* Filtros activos (la búsqueda vive en el header) */}
      {hasActiveFilters ? (
        <section className="border-b border-ink-100 bg-ink-50/70">
          <div className="container-x py-3 sm:py-4">
            <ActiveFilters filters={filters} catName={catName} />
          </div>
        </section>
      ) : null}

      <div className="container-x mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block" aria-label="Filtros">
          <div className="sticky top-[136px] max-h-[calc(100dvh-156px)] overflow-y-auto pr-2 scrollbar-none">
            <FilterPanel {...panelProps} idPrefix="d" />
          </div>
        </aside>

        {/* Resultados */}
        <section className="min-w-0" aria-labelledby="shop-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="eyebrow">{filters.q ? "Búsqueda" : parent ? parent.name : filters.cat ? "Categoría" : "Catálogo completo"}</span>
              <h1 id="shop-title" className="mt-1 text-2xl sm:text-3xl lg:text-4xl">
                {title}
              </h1>
              {category?.description ? <p className="mt-2 max-w-2xl text-ink-500">{category.description}</p> : null}
              <p className="mt-2 text-sm text-ink-500" aria-live="polite">
                {total === 0 ? "Sin productos" : total === 1 ? "1 producto" : `${total.toLocaleString("es-CL")} productos`}
                {total > result.perPage ? <span className="text-ink-400"> · mostrando {from}–{to}</span> : null}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              <div className="lg:hidden">
                <Suspense fallback={null}>
                  <FilterDrawer {...panelProps} total={total} />
                </Suspense>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                {filters.q ? <span className="text-xs text-ink-400">Ordenado por relevancia</span> : <SortSelect filters={filters} options={SORT_OPTIONS} id="orden-top" className="w-56" />}
              </div>
            </div>
          </div>

          {current ? (
            <div className="mt-5">
              <SubcategoryChips filters={filters} current={current} parent={parent} />
            </div>
          ) : null}

          <div className="mt-6">
            {items.length ? (
              <>
                <ProductGrid products={items} />
                <Pagination filters={filters} page={page} pages={pages} className="mt-10" />
              </>
            ) : (
              <EmptyState filters={filters} brands={topBrands} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
