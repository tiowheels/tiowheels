import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RoadIcon, BlisterIcon, StartLightsIcon, HelmetIcon, SteeringWheelIcon, ShieldWheelIcon, CheckeredFlagIcon } from "@/components/ui/AutoIcons";
import { InstagramIcon } from "@/components/ui/BrandIcons";
import { SITE } from "@/lib/site";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Nosotros",
  description: `${SITE.mission.split(".")[0]}. Más de 3.500 autos a escala, envíos a todo Chile y una comunidad de coleccionistas.`,
  alternates: { canonical: "/nosotros" },
};

const BENEFIT_ICONS = [RoadIcon, BlisterIcon, StartLightsIcon, HelmetIcon];

export default async function AboutPage() {
  const [inStock, collage] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE", stock: { gt: 0 } } }),
    db.product.findMany({
      where: { status: "ACTIVE", stock: { gt: 0 }, images: { some: {} } },
      orderBy: [{ totalSales: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { id: true, slug: true, name: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } },
    }),
  ]);

  const stats = [
    { value: `+${Math.max(3500, Math.floor(inStock / 100) * 100).toLocaleString("es-CL")}`, label: "productos en catálogo", hint: `${inStock.toLocaleString("es-CL")} disponibles hoy` },
    { value: "16", label: "regiones de Chile", hint: "Envíos de Arica a Magallanes" },
    { value: "24/7", label: "ventas en línea", hint: "Compra a cualquier hora" },
    { value: "@tiowheels", label: "comunidad en Instagram", hint: "Novedades, lanzamientos y sorteos" },
  ];

  return (
    <div className="pb-16">
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="pointer-events-none absolute -left-32 top-0 size-[480px] rounded-full bg-lime/25 blur-[140px]" />
        <div className="container-x relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div className="animate-fade-up">
            <span className="eyebrow !text-lime">Nosotros</span>
            <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              El Tío Wheels que <span className="text-lime">siempre sabe</span> lo que hace
            </h1>
            <p className="mt-5 max-w-md text-ink-300 sm:text-lg">
              Somos una tienda chilena de autos a escala hecha por coleccionistas, para coleccionistas. Hot Wheels, Matchbox, premium, Treasure Hunt y piezas que cuentan historias.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/tienda" className="btn-lime btn-md">
                Ver la tienda <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href={SITE.instagram} target="_blank" rel="noreferrer" className="btn-outline btn-md border-white/20 bg-transparent text-white hover:bg-white/10 hover:border-white">
                <InstagramIcon className="size-4" /> @tiowheels
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-hidden>
            {collage.map((p, i) => (
              <Link key={p.id} href={`/producto/${p.slug}`} tabIndex={-1} className={`group overflow-hidden rounded-2xl bg-white/10 ${i % 3 === 1 ? "translate-y-4" : ""}`}>
                <img src={mediaUrl(p.images[0]?.path, "medium")} alt="" loading={i < 3 ? "eager" : "lazy"} className="aspect-[4/5] size-full object-cover transition duration-700 group-hover:scale-105" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container-x -mt-8 relative z-10 md:-mt-10" aria-label="Cifras">
        <dl className="card grid grid-cols-2 divide-ink-100 md:grid-cols-4 md:divide-x">
          {stats.map((s) => (
            <div key={s.label} className="p-5 sm:p-7">
              <dd className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{s.value}</dd>
              <dt className="mt-1 text-sm font-semibold text-ink-700">{s.label}</dt>
              <p className="mt-0.5 text-xs text-ink-400">{s.hint}</p>
            </div>
          ))}
        </dl>
      </section>

      {/* MISIÓN / VISIÓN */}
      <section className="container-x mt-14 grid gap-6 md:mt-20 md:grid-cols-2">
        <article className="card p-8 md:p-10">
          <span className="flex size-12 items-center justify-center rounded-full bg-lime text-ink">
            <SteeringWheelIcon className="size-6" />
          </span>
          <span className="eyebrow mt-6 block">Misión</span>
          <h2 className="mt-2 text-2xl">Piezas únicas que cuentan historias</h2>
          <p className="mt-3 leading-relaxed text-ink-500">{SITE.mission}</p>
        </article>
        <article className="relative overflow-hidden rounded-card bg-ink p-8 text-white md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-lime/30 blur-[90px]" />
          <span className="relative flex size-12 items-center justify-center rounded-full bg-white/10 text-lime">
            <ShieldWheelIcon className="size-6" />
          </span>
          <span className="eyebrow relative mt-6 block !text-lime">Visión</span>
          <h2 className="relative mt-2 text-2xl">Confianza, cercanía y entrega segura</h2>
          <p className="relative mt-3 leading-relaxed text-ink-300">{SITE.vision}</p>
        </article>
      </section>

      {/* BENEFICIOS */}
      <section className="container-x mt-14 md:mt-20">
        <span className="eyebrow">Por qué comprar con el Tío Wheels</span>
        <h2 className="mt-1 text-2xl sm:text-3xl">Lo que puedes esperar de nosotros</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SITE.benefits.map((b, i) => {
            const Icon = BENEFIT_ICONS[i];
            return (
              <div key={b.title} className="card p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-lime-50 text-lime-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base">{b.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{b.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMUNIDAD */}
      <section className="container-x mt-14 md:mt-20">
        <a href={SITE.instagram} target="_blank" rel="noreferrer" className="group relative flex flex-col gap-6 overflow-hidden rounded-card bg-ink p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
          {/* Foto de un auto difuminada + destellos lima: los colores de la marca */}
          {collage[0]?.images[0] && <img src={mediaUrl(collage[0].images[0].path, "medium")} alt="" aria-hidden className="pointer-events-none absolute -right-10 top-1/2 w-[46%] -translate-y-1/2 rotate-6 object-contain opacity-60 blur-lg transition duration-700 group-hover:scale-110 group-hover:opacity-80" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
          <div className="pointer-events-none absolute -left-24 top-0 size-[380px] rounded-full bg-lime/30 blur-[120px]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="relative max-w-xl">
            <div className="flex items-center gap-3">
              <InstagramIcon className="size-9 text-lime" />
              <CheckeredFlagIcon className="size-7 text-lime/70" />
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl">Una comunidad que colecciona la emoción</h2>
            <p className="mt-2 text-ink-300">Lanzamientos en vivo, llegadas de la semana, sorteos y la mejor conversación sobre autos a escala en Chile. Súmate en Instagram.</p>
          </div>
          <span className="btn relative h-12 shrink-0 bg-lime px-6 text-sm text-ink transition group-hover:bg-white">
            Seguir a @tiowheels <ArrowRight className="size-4" aria-hidden />
          </span>
        </a>
      </section>
    </div>
  );
}
