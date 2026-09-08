"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Check } from "lucide-react";
import { buildShopUrl, toggleBrand, type ShopQuery } from "@/lib/shop-url";
import { cn, formatCLP } from "@/lib/format";
import type { BrandFacet, ShopCategoryNode, SortOption } from "./types";
import { SortSelect } from "./SortSelect";
import { useShopNav } from "./useShopNav";

export type FilterPanelProps = {
  filters: ShopQuery;
  tree: ShopCategoryNode[];
  brands: BrandFacet[];
  priceMin: number;
  priceMax: number;
  sortOptions: readonly SortOption[];
  /** En móvil mostramos el select de orden dentro del panel. */
  showSort?: boolean;
  idPrefix?: string;
};

export function FilterPanel({ filters, tree, brands, priceMin, priceMax, sortOptions, showSort, idPrefix = "f" }: FilterPanelProps) {
  const { go, pending } = useShopNav();

  return (
    <div className={cn("flex flex-col gap-7 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      {showSort ? (
        <Section title="Ordenar">
          <SortSelect filters={filters} options={sortOptions} id={`${idPrefix}-orden`} disabled={!!filters.q} />
          {filters.q ? <p className="mt-2 text-xs text-ink-400">Con una búsqueda activa, ordenamos por relevancia.</p> : null}
        </Section>
      ) : null}

      <Section title="Categorías">
        <CategoryTree filters={filters} tree={tree} onGo={go} />
      </Section>

      {brands.length ? (
        <Section title="Marca">
          <BrandList filters={filters} brands={brands} onGo={go} idPrefix={idPrefix} />
        </Section>
      ) : null}

      <Section title="Precio">
        <PriceRange filters={filters} priceMin={priceMin} priceMax={priceMax} onGo={go} idPrefix={idPrefix} />
      </Section>

      <Section title="Disponibilidad">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink-700">Mostrar agotados</span>
          <span className="relative inline-flex">
            <input
              type="checkbox"
              role="switch"
              checked={!!filters.agotados}
              onChange={(e) => go(buildShopUrl(filters, { agotados: e.target.checked || undefined }))}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-ink-200 transition peer-checked:bg-lime peer-focus-visible:ring-2 peer-focus-visible:ring-lime peer-focus-visible:ring-offset-2" aria-hidden />
            <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" aria-hidden />
          </span>
        </label>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">{title}</h3>
      {children}
    </section>
  );
}

/* ---------- Categorías ---------- */

function CategoryTree({ filters, tree, onGo }: { filters: ShopQuery; tree: ShopCategoryNode[]; onGo: (url: string) => void }) {
  const parentOfCurrent = useMemo(() => tree.find((r) => r.children.some((c) => c.slug === filters.cat))?.slug, [tree, filters.cat]);
  const [open, setOpen] = useState<Set<string>>(() => new Set([filters.cat, parentOfCurrent].filter((s): s is string => !!s)));
  const [showAll, setShowAll] = useState(false);
  const [prevCat, setPrevCat] = useState(filters.cat);

  // Al cambiar la categoría activa, expande su rama (ajuste de estado durante el render).
  if (prevCat !== filters.cat) {
    setPrevCat(filters.cat);
    setOpen((prev) => {
      const next = new Set(prev);
      if (filters.cat) next.add(filters.cat);
      if (parentOfCurrent) next.add(parentOfCurrent);
      return next;
    });
  }

  const roots = tree.filter((r) => r.count > 0 || r.slug === filters.cat || r.slug === parentOfCurrent);
  const LIMIT = 10;
  const visible = showAll ? roots : roots.filter((r, i) => i < LIMIT || r.slug === filters.cat || r.slug === parentOfCurrent);

  function toggle(slug: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <div>
      <ul className="flex flex-col gap-0.5">
        <li>
          <button type="button" onClick={() => onGo(buildShopUrl(filters, { cat: undefined }))} aria-current={!filters.cat ? "true" : undefined} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition hover:bg-ink-50", !filters.cat ? "bg-lime-50 font-bold text-ink" : "font-medium text-ink-700")}>
            Todas las categorías
          </button>
        </li>
        {visible.map((root) => {
          const kids = root.children.filter((c) => c.count > 0 || c.slug === filters.cat);
          const expanded = open.has(root.slug);
          const active = filters.cat === root.slug;
          return (
            <li key={root.slug}>
              <div className={cn("flex items-center rounded-lg transition hover:bg-ink-50", active && "bg-lime-50")}>
                <button type="button" onClick={() => onGo(buildShopUrl(filters, { cat: root.slug }))} aria-current={active ? "true" : undefined} title={root.name} className={cn("flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm", active ? "font-bold text-ink" : "font-medium text-ink-700")}>
                  <span className="min-w-0 flex-1 truncate">{root.name}</span>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-400">{root.count}</span>
                </button>
                {kids.length ? (
                  <button type="button" onClick={() => toggle(root.slug)} aria-expanded={expanded} aria-label={`${expanded ? "Ocultar" : "Ver"} subcategorías de ${root.name}`} className="mr-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink">
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                ) : (
                  <span className="mr-0.5 size-7 shrink-0" aria-hidden />
                )}
              </div>
              {kids.length && expanded ? (
                <ul className="mb-1 ml-3 border-l border-ink-100 pl-2">
                  {kids.map((c) => {
                    const a = filters.cat === c.slug;
                    return (
                      <li key={c.slug}>
                        <button type="button" onClick={() => onGo(buildShopUrl(filters, { cat: c.slug }))} aria-current={a ? "true" : undefined} title={c.name} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 pr-8 text-left text-[13px] transition hover:bg-ink-50", a ? "bg-lime-50 font-bold text-ink" : "font-medium text-ink-500")}>
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-400">{c.count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {roots.length > LIMIT ? (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-2 px-2 text-[13px] font-semibold text-lime-700 hover:underline">
          {showAll ? "Ver menos" : `Ver todas (${roots.length})`}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Marcas ---------- */

function BrandList({ filters, brands, onGo, idPrefix }: { filters: ShopQuery; brands: BrandFacet[]; onGo: (url: string) => void; idPrefix: string }) {
  const [term, setTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const selected = useMemo(() => new Set(filters.marca ?? []), [filters.marca]);
  const LIMIT = 8;

  const list = useMemo(() => {
    const t = term.trim().toLowerCase();
    const filtered = t ? brands.filter((b) => b.name.toLowerCase().includes(t)) : brands;
    // Las seleccionadas siempre arriba.
    return [...filtered].sort((a, b) => Number(selected.has(b.name)) - Number(selected.has(a.name)));
  }, [brands, term, selected]);

  const visible = showAll || term ? list : list.slice(0, LIMIT);

  return (
    <div>
      {brands.length > LIMIT ? (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar marca" aria-label="Buscar marca" className="input h-9 rounded-lg pl-9 text-sm" />
        </div>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {visible.map((b) => {
          const checked = selected.has(b.name);
          const id = `${idPrefix}-marca-${b.name.replace(/\W+/g, "-")}`;
          return (
            <li key={b.name}>
              <label htmlFor={id} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-ink-50", checked && "font-bold")}>
                <input id={id} type="checkbox" checked={checked} onChange={() => onGo(toggleBrand(filters, b.name))} className="peer sr-only" />
                <span className={cn("flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition peer-focus-visible:ring-2 peer-focus-visible:ring-lime peer-focus-visible:ring-offset-1", checked ? "border-ink bg-ink text-white" : "border-ink-300 bg-white")} aria-hidden>
                  {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink-700">{b.name}</span>
                <span className="text-xs tabular-nums text-ink-400">{b.count}</span>
              </label>
            </li>
          );
        })}
        {!visible.length ? <li className="px-2 py-1.5 text-sm text-ink-400">Sin coincidencias</li> : null}
      </ul>
      {!term && list.length > LIMIT ? (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-2 px-2 text-[13px] font-semibold text-lime-700 hover:underline">
          {showAll ? "Ver menos" : `Ver todas (${list.length})`}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Precio ---------- */

function PriceRange({ filters, priceMin, priceMax, onGo, idPrefix }: { filters: ShopQuery; priceMin: number; priceMax: number; onGo: (url: string) => void; idPrefix: string }) {
  const [min, setMin] = useState(filters.min != null ? String(filters.min) : "");
  const [max, setMax] = useState(filters.max != null ? String(filters.max) : "");
  const [prevRange, setPrevRange] = useState(`${filters.min ?? ""}-${filters.max ?? ""}`);
  const hint = useId();

  // Sincroniza los inputs cuando cambia el rango en la URL (ajuste de estado durante el render).
  const range = `${filters.min ?? ""}-${filters.max ?? ""}`;
  if (prevRange !== range) {
    setPrevRange(range);
    setMin(filters.min != null ? String(filters.min) : "");
    setMax(filters.max != null ? String(filters.max) : "");
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    let lo = min === "" ? undefined : Math.max(0, Math.floor(Number(min)));
    let hi = max === "" ? undefined : Math.max(0, Math.floor(Number(max)));
    if (lo != null && !Number.isFinite(lo)) lo = undefined;
    if (hi != null && !Number.isFinite(hi)) hi = undefined;
    if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
    onGo(buildShopUrl(filters, { min: lo, max: hi }));
  }

  const dirty = (min || "") !== (filters.min != null ? String(filters.min) : "") || (max || "") !== (filters.max != null ? String(filters.max) : "");

  return (
    <form onSubmit={apply} aria-describedby={hint}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${idPrefix}-min`} className="label text-xs">
            Mínimo
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">$</span>
            <input id={`${idPrefix}-min`} type="number" inputMode="numeric" min={0} step={500} value={min} onChange={(e) => setMin(e.target.value)} placeholder={String(priceMin)} className="input h-10 rounded-lg pl-7 pr-2 text-sm tabular-nums" />
          </div>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-max`} className="label text-xs">
            Máximo
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">$</span>
            <input id={`${idPrefix}-max`} type="number" inputMode="numeric" min={0} step={500} value={max} onChange={(e) => setMax(e.target.value)} placeholder={String(priceMax)} className="input h-10 rounded-lg pl-7 pr-2 text-sm tabular-nums" />
          </div>
        </div>
      </div>
      <p id={hint} className="mt-1.5 text-xs text-ink-400">
        Entre {formatCLP(priceMin)} y {formatCLP(priceMax)}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="submit" className={cn("btn-sm flex-1", dirty ? "btn-primary" : "btn-outline")}>
          Aplicar
        </button>
        {filters.min != null || filters.max != null ? (
          <button type="button" onClick={() => onGo(buildShopUrl(filters, { min: undefined, max: undefined }))} className="btn-ghost btn-sm">
            Quitar
          </button>
        ) : null}
      </div>
    </form>
  );
}
