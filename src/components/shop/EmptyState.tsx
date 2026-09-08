import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FuelPumpIcon } from "@/components/ui/AutoIcons";
import { buildShopUrl, countActiveFilters, type ShopQuery } from "@/lib/shop-url";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import type { BrandFacet } from "./types";

export function EmptyState({ filters, brands }: { filters: ShopQuery; brands: BrandFacet[] }) {
  const active = countActiveFilters(filters);
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center sm:py-20">
      <div className="flex size-20 items-center justify-center rounded-full bg-lime-50 text-lime-700">
        <FuelPumpIcon className="size-9" />
      </div>
      <h2 className="mt-5 text-2xl">No encontramos resultados</h2>
      <p className="mt-2 max-w-md text-ink-500">
        {filters.q ? (
          <>
            Nada coincide con <b className="text-ink">“{filters.q}”</b>. Revisa la ortografía o prueba con un término más corto, como la marca o el modelo.
          </>
        ) : (
          <>Ningún producto coincide con los filtros seleccionados. Prueba quitando alguno.</>
        )}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {active > 1 && filters.q ? (
          <Link href={buildShopUrl({ q: filters.q })} className="btn-outline btn-md">
            Buscar “{filters.q}” en todo
          </Link>
        ) : null}
        {!filters.agotados && active > 0 ? (
          <Link href={buildShopUrl(filters, { agotados: true })} className="btn-outline btn-md">
            Incluir agotados
          </Link>
        ) : null}
        <Link href="/tienda" className="btn-primary btn-md">
          Ver todo el catálogo <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {brands.length ? (
        <div className="mt-10 w-full max-w-xl">
          <div className="eyebrow">O busca por marca</div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {brands.map((b) => (
              <Link key={b.name} href={buildShopUrl({ marca: [b.name] })} className="chip">
                {b.name} <span className="text-ink-400">{b.count}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <a href={whatsappLink(filters.q ? `Hola Tío Wheels, ¿tienen "${filters.q}"?` : "Hola Tío Wheels, busco un modelo en particular")} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink">
        <WhatsAppIcon className="size-4 text-[#25D366]" /> ¿No lo encuentras? Pregúntanos por WhatsApp
      </a>
    </div>
  );
}
