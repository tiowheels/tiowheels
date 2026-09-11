import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RoadIcon, BlisterIcon, StartLightsIcon, HelmetIcon, TrophyIcon, CheckeredFlagIcon, SteeringWheelIcon, WheelIcon, CarIcon } from "@/components/ui/AutoIcons";
import { InstagramIcon } from "@/components/ui/BrandIcons";
import { getHomeSections, getCollectionCards, getTopBrands, getHeroProducts, getRecentSales, getSiteStats, FEATURED_COLLECTIONS } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { ProductGrid } from "@/components/product/ProductGrid";
import { mediaUrl } from "@/lib/media-url";
import { HeroShowcase } from "@/components/site/HeroShowcase";
import { RotatingText } from "@/components/site/RotatingText";
import { Marquee } from "@/components/site/Marquee";
import { StatsCounter } from "@/components/site/StatsCounter";
import { RecentSalesTicker } from "@/components/site/RecentSalesTicker";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { Faq } from "@/components/site/Faq";
import { safeJsonLd } from "@/lib/seo";

// Se renderiza en cada visita: las colecciones de "¿Qué estás buscando hoy?" son al azar.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} · Hot Wheels, Matchbox y autos a escala 1:64 en Chile` },
  description:
    "Compra autos de colección Hot Wheels, Matchbox, Mini GT y más en Tío Wheels: más de 3.500 modelos nuevos en blíster, envíos a todo Chile, pago seguro con Webpay y atención por WhatsApp.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: `${SITE.name} · Autos de colección Hot Wheels en Chile`,
    description: "Más de 3.500 autos a escala 1:64 nuevos en blíster. Envíos a todo Chile, pago seguro y atención por WhatsApp.",
  },
};

const ORG_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.name,
      legalName: SITE.legalName,
      url: SITE.url,
      logo: { "@type": "ImageObject", url: `${SITE.url}/brand/logo.png`, width: 1080, height: 432 },
      email: SITE.email,
      telephone: SITE.phone,
      sameAs: [SITE.instagram, SITE.facebook],
      contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: SITE.phone, email: SITE.email, availableLanguage: "es" },
      areaServed: "CL",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "es-CL",
      publisher: { "@id": `${SITE.url}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/tienda?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

const BENEFIT_ICONS = [RoadIcon, BlisterIcon, StartLightsIcon, HelmetIcon];

export default async function HomePage() {
  const [sections, collections, brands, heroProducts, recentSales, stats] = await Promise.all([getHomeSections(), getCollectionCards(), getTopBrands(14), getHeroProducts(5), getRecentSales(14), getSiteStats()]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ORG_LD) }} />
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="pointer-events-none absolute -left-40 top-10 size-[520px] rounded-full bg-lime/25 blur-[140px] motion-safe:animate-blob" />
        <div className="pointer-events-none absolute -right-32 bottom-0 size-[420px] rounded-full bg-lime/10 blur-[120px] motion-safe:animate-blob [animation-delay:-6s]" />
        <div className="container-x relative grid items-center gap-10 py-14 md:grid-cols-2 md:items-start md:py-20 lg:py-24">
          <div className="animate-fade-up">
            <span className="eyebrow !text-lime">Autos a escala 1:64 · Hot Wheels, Matchbox y más</span>
            <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              {SITE.hero.lines[0]}
              <RotatingText className="mt-1 min-h-[2.15em] text-lime [perspective:600px]" phrases={["Los mejores modelos aquí", "Adrenalina en miniatura", "Descubre tu próximo favorito", "Premium y Treasure Hunt", "Clásicos de los 90"]} />
            </h1>
            <p className="mt-5 max-w-md text-base text-ink-300 sm:text-lg">
              Más de {sections.totalInStock.toLocaleString("es-CL")} modelos disponibles hoy, Hot Wheels, Matchbox y ediciones especiales, con envíos a todo Chile.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {brands.slice(0, 7).map((b) => (
                <Link key={b.name} href={`/tienda?q=${encodeURIComponent(b.name)}`} className="chip border-white/15 bg-white/5 text-white hover:border-lime hover:bg-white/10">
                  {b.name}
                </Link>
              ))}
              <Link href="/tienda" className="chip border-lime bg-lime text-ink hover:bg-lime-600">
                Ver todo <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="md:mt-8 lg:mt-6">
            <HeroShowcase products={heroProducts} />
          </div>
        </div>
        <div className="container-x relative pb-10">
          <StatsCounter stats={[{ value: stats.inStock, prefix: "+", label: "modelos con stock" }, { value: stats.orders, prefix: "+", label: "pedidos entregados" }, { value: stats.customers, prefix: "+", label: "coleccionistas" }]} />
        </div>
        <div className="border-t border-white/10 bg-white/[0.03]">
          <div className="container-x grid grid-cols-2 gap-4 py-5 md:grid-cols-4">
            {SITE.benefits.map((b, i) => {
              const Icon = BENEFIT_ICONS[i];
              return (
                <div key={b.title} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold">{b.title}</div>
                    <div className="hidden text-xs text-ink-400 sm:block">{b.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-white/10 py-3">
          <Marquee speed={45} className="text-[13px] font-bold uppercase tracking-[0.2em] text-ink-300">
            {[...brands.map((b) => b.name), ...FEATURED_COLLECTIONS.map((c) => c.name)].map((t) => (
              <span key={t} className="flex items-center gap-8">
                {t} <span className="text-lime">✦</span>
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      <RecentSalesTicker sales={recentSales} />

      {/* COLECCIONES */}
      <section className="container-x pt-14 md:pt-20">
        <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-lime">
              <WheelIcon className="size-6" />
            </span>
            <div>
              <span className="eyebrow">Explora por colección</span>
              <h2 className="mt-0.5 text-2xl sm:text-3xl">¿Qué estás buscando hoy?</h2>
            </div>
          </div>
          <Link href="/tienda" className="btn-outline btn-sm shrink-0">Todas las categorías</Link>
        </div>
        <RevealGroup className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
          {collections.map((c) => (
            <RevealItem key={c.slug} className="w-[calc(50%-0.375rem)] shrink-0 snap-start sm:w-auto">
            <Link href={`/tienda?cat=${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-card bg-ink-100">
              <img src={mediaUrl(c.image, "medium")} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="text-base font-bold leading-tight">{c.name}</div>
                <div className="mt-0.5 text-[11px] text-ink-300">{c.count} disponibles</div>
              </div>
            </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* RECIENTES */}
      <Reveal as="section" className="container-x pt-14 md:pt-20">
        <SectionHead eyebrow="Recién llegados" title="Productos recientes" href="/tienda?orden=nuevo" icon={StartLightsIcon} />
        <ProductGrid products={sections.recent} animated />
      </Reveal>

      {/* BANNER PREMIUM */}
      {sections.premium.length ? (
        <section className="container-x pt-14 md:pt-20">
          <div className="relative overflow-hidden rounded-card bg-ink px-6 py-10 text-white md:px-12 md:py-14">
            <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-lime/30 blur-[100px]" />
            <div className="relative grid items-center gap-8 md:grid-cols-2">
              <div>
                <span className="eyebrow !text-lime">Hot Wheels Premium</span>
                <h2 className="mt-2 text-3xl md:text-4xl">Real Riders, Car Culture y Boulevard</h2>
                <p className="mt-3 max-w-md text-ink-300">Ruedas de goma, detalles metálicos y las series más buscadas por coleccionistas. Piezas que suben de valor con el tiempo.</p>
                <Link href="/tienda?cat=hotwheels-premium" className="btn-lime btn-md mt-6">
                  <TrophyIcon className="size-4" /> Ver colección Premium
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-2 md:gap-3">
                {sections.premium.slice(0, 8).map((p) => (
                  <Link key={p.id} href={`/producto/${p.slug}`} className="group aspect-[3/4] overflow-hidden rounded-xl bg-white/10">
                    <img src={mediaUrl(p.images[0]?.path, "thumb")} alt={p.name} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* VISTOS RECIENTEMENTE (solo si hay historial) */}
      <RecentlyViewed className="container-x pt-14 md:pt-20" />

      {/* MÁS VENDIDOS */}
      <Reveal as="section" className="container-x pt-14 md:pt-20">
        <SectionHead eyebrow="Los favoritos" title="Productos destacados" href="/tienda?orden=vendidos" icon={CheckeredFlagIcon} />
        <ProductGrid products={sections.bestSellers} animated />
      </Reveal>

      {/* MARCAS */}
      <section className="container-x pt-14 md:pt-20">
        <SectionHead eyebrow="Por marca" title="Busca tu marca favorita" href="/tienda" icon={SteeringWheelIcon} />
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <Link key={b.name} href={`/tienda?q=${encodeURIComponent(b.name)}`} className="chip h-10 px-4 text-sm">
              {b.name} <span className="text-ink-400">{b.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <Faq className="container-x pt-14 md:pt-20" />

      {/* NOSOTROS + INSTAGRAM */}
      <section className="container-x grid gap-6 pt-14 md:grid-cols-2 md:pt-20">
        <div className="card p-8 md:p-10">
          <CarIcon className="mb-4 size-10 text-lime-700" />
          <span className="eyebrow">Nosotros</span>
          <h2 className="mt-2 text-2xl">El Tío Wheels que siempre sabe lo que hace</h2>
          <p className="mt-3 text-ink-500">{SITE.mission}</p>
          <Link href="/nosotros" className="btn-outline btn-md mt-6">Conócenos</Link>
        </div>
        <a href={SITE.instagram} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-card bg-ink p-8 text-white md:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="pointer-events-none absolute -left-24 top-0 size-[340px] rounded-full bg-lime/25 blur-[120px]" />
          {/* Mosaico de autos del catálogo: se lee como un feed de Instagram */}
          <div className="pointer-events-none absolute -bottom-8 -right-6 hidden w-[46%] rotate-6 grid-cols-2 gap-2.5 lg:grid">
            {heroProducts.slice(0, 4).map((p) => (
              <span key={p.id} className="aspect-square overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-white/15">
                <img src={mediaUrl(p.image, "thumb")} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
              </span>
            ))}
          </div>
          <div className="relative lg:pr-[46%]">
            <InstagramIcon className="size-10 text-lime" />
            <h2 className="mt-4 text-2xl">Síguenos en Instagram</h2>
            <p className="mt-2 max-w-sm text-ink-300">Novedades cada semana, lanzamientos en vivo y sorteos para la comunidad. @tiowheels</p>
            <span className="btn mt-6 h-11 bg-lime px-5 text-sm text-ink transition group-hover:bg-white">Ir a Instagram <ArrowRight className="size-4" /></span>
          </div>
        </a>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, href, icon: Icon }: { eyebrow: string; title: string; href: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-lime">
            <Icon className="size-6" />
          </span>
        ) : null}
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="mt-0.5 text-2xl sm:text-3xl">{title}</h2>
        </div>
      </div>
      <Link href={href} className="btn-ghost btn-sm shrink-0 text-lime-700">
        Ver más <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
