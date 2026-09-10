import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RoadIcon, GarageIcon, ShieldWheelIcon, CheckeredFlagIcon, WheelIcon, BlisterIcon } from "@/components/ui/AutoIcons";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media-url";
import { SITE, whatsappLink } from "@/lib/site";
import { stripHtml } from "@/lib/format";
import { Price } from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ProductGallery } from "@/components/product/ProductGallery";
import { AddToCart } from "@/components/product/AddToCart";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ShareButton } from "@/components/product/ShareButton";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ProductViewEvent } from "@/components/analytics/ProductViewEvent";
import { safeJsonLd } from "@/lib/seo";
import { collectionOf } from "@/lib/collections";

type Params = Promise<{ slug: string }>;

function describe(p: { name: string; brand: string | null; shortDescription: string | null; description: string | null }) {
  const own = p.shortDescription || p.description;
  if (own) {
    const t = stripHtml(own);
    if (t.length > 40) return t.length > 160 ? t.slice(0, 157) + "…" : t;
  }
  return `${p.name}${p.brand ? ` (${p.brand})` : ""} a escala 1:64. Compra en Tío Wheels con envío a todo Chile, pago seguro y atención por WhatsApp.`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.status !== "ACTIVE") return { title: "Producto no encontrado" };
  const img = p.images[0]?.path;
  return {
    title: p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.name} · ${p.brand}` : p.name,
    description: describe(p),
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description: describe(p),
      url: `/producto/${p.slug}`,
      images: img ? [{ url: `${SITE.url}${mediaUrl(img, "large")}`, width: p.images[0]?.width ?? undefined, height: p.images[0]?.height ?? undefined, alt: p.images[0]?.alt ?? p.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "ACTIVE") notFound();

  const soldOut = product.stock <= 0;
  const mainCategory = product.categories.find((c) => !c.parentId) ?? product.categories[0] ?? null;
  const subCategory = product.categories.find((c) => c.parentId && c.id !== mainCategory?.id) ?? null;
  const url = `${SITE.url}/producto/${product.slug}`;
  const description = product.description ? stripHtml(product.description) : "";
  const shortDescription = product.shortDescription ? stripHtml(product.shortDescription) : "";
  const paragraphs = description.split(/\n{2,}|(?<=\.)\s{2,}/).map((s) => s.trim()).filter(Boolean);
  const collection = collectionOf(product.categories);

  const stockBadge = soldOut ? (
    <Badge tone="dark">Agotado</Badge>
  ) : product.stock === 1 ? (
    <Badge tone="warn">Última unidad</Badge>
  ) : product.stock <= 5 ? (
    <Badge tone="warn">Quedan {product.stock}</Badge>
  ) : (
    <Badge tone="success">Disponible</Badge>
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: describe(product),
    sku: product.legacyId ? String(product.legacyId) : product.id,
    image: product.images.map((i) => `${SITE.url}${mediaUrl(i.path, "large")}`),
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: mainCategory?.name,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "CLP",
      price: product.price,
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE.name },
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Tienda", item: `${SITE.url}/tienda` },
      ...(mainCategory ? [{ "@type": "ListItem", position: 3, name: mainCategory.name, item: `${SITE.url}/tienda?cat=${mainCategory.slug}` }] : []),
      { "@type": "ListItem", position: mainCategory ? 4 : 3, name: product.name, item: url },
    ],
  };

  return (
    <div className="container-x pb-24 pt-4 md:pb-16 md:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <ProductViewEvent product={{ id: product.id, name: product.name, price: product.price, brand: product.brand, category: mainCategory?.name ?? null }} />

      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Tienda", href: "/tienda" },
          ...(mainCategory ? [{ label: mainCategory.name, href: `/tienda?cat=${mainCategory.slug}` }] : []),
          ...(subCategory ? [{ label: subCategory.name, href: `/tienda?cat=${subCategory.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-4 grid gap-8 md:mt-6 md:grid-cols-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        {/* Galería */}
        <div className="md:sticky md:top-[100px] md:self-start">
          <ProductGallery images={product.images.map((i) => ({ path: i.path, alt: i.alt, width: i.width, height: i.height }))} name={product.name} soldOut={soldOut} />
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            {product.brand ? (
              <Link href={`/tienda?marca=${encodeURIComponent(product.brand)}`} className="eyebrow w-fit hover:underline">
                {product.brand}
              </Link>
            ) : (
              <span />
            )}
            <ShareButton url={url} title={product.name} text={`Mira este ${product.brand ?? "auto"} en Tío Wheels`} />
          </div>
          <h1 className="mt-2 text-2xl leading-tight sm:text-3xl lg:text-4xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Price amount={product.price} compareAt={product.compareAtPrice} size="lg" className="text-3xl sm:text-4xl" />
            {soldOut ? stockBadge : null}
            {product.compareAtPrice && product.compareAtPrice > product.price ? <Badge tone="lime">-{Math.round((1 - product.price / product.compareAtPrice) * 100)}%</Badge> : null}
          </div>
          {shortDescription ? <p className="mt-3 text-ink-500">{shortDescription}</p> : null}

          <div className="mt-6">
            <AddToCart
              product={{ id: product.id, slug: product.slug, name: product.name, price: product.price, compareAtPrice: product.compareAtPrice, stock: product.stock, image: product.images[0]?.path ?? null }}
              relatedAnchor="relacionados"
            />
          </div>

          <a
            href={whatsappLink(`Hola Tío Wheels, quiero consultar por "${product.name}" ${url}`)}
            target="_blank"
            rel="noreferrer"
            className="btn-outline btn-md mt-3 w-full border-[#25D366]/40 text-ink hover:border-[#25D366] hover:bg-[#25D366]/10"
          >
            <WhatsAppIcon className="size-5 text-[#25D366]" /> Consultar por WhatsApp
          </a>

          {/* Confianza */}
          <ul className="mt-6 grid gap-3 rounded-card bg-ink-50 p-4 text-sm sm:grid-cols-3 sm:p-5">
            <li className="flex gap-3 sm:flex-col sm:gap-2">
              <RoadIcon className="size-5 shrink-0 text-lime-700" />
              <div>
                <div className="font-bold">Envíos a todo Chile</div>
                <div className="text-xs text-ink-500">Por pagar al recibir, vía Blue Express o Starken.</div>
              </div>
            </li>
            <li className="flex gap-3 sm:flex-col sm:gap-2">
              <GarageIcon className="size-5 shrink-0 text-lime-700" />
              <div>
                <div className="font-bold">Retiro sin costo</div>
                <div className="text-xs text-ink-500">Metro El Llano o dirección comercial.</div>
              </div>
            </li>
            <li className="flex gap-3 sm:flex-col sm:gap-2">
              <ShieldWheelIcon className="size-5 shrink-0 text-lime-700" />
              <div>
                <div className="font-bold">Pago seguro</div>
                <div className="text-xs text-ink-500">Flow, Webpay, tarjetas o transferencia.</div>
              </div>
            </li>
          </ul>

          {/* Categorías */}
          {product.categories.length ? (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">
                <CheckeredFlagIcon className="size-3.5" /> Categorías
              </div>
              <div className="flex flex-wrap gap-2">
                {product.categories.map((c) => (
                  <Link key={c.id} href={`/tienda?cat=${c.slug}`} className="chip h-auto min-h-8 py-1 text-left">
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Descripción */}
          {paragraphs.length ? (
            <section className="mt-8 border-t border-ink-100 pt-6" aria-labelledby="desc-title">
              <h2 id="desc-title" className="text-lg">
                Descripción
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-700">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {/* Ficha técnica */}
          <section className="mt-8 border-t border-ink-100 pt-6" aria-labelledby="specs-title">
            <h2 id="specs-title" className="flex items-center gap-2 text-lg">
              <WheelIcon className="size-5 text-lime-700" /> Ficha técnica
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-card bg-ink-100 text-sm sm:grid-cols-3">
              <Spec label="Escala" value="1:64" />
              <Spec label="Marca" value={product.brand ?? "Hot Wheels"} href={product.brand ? `/tienda?marca=${encodeURIComponent(product.brand)}` : undefined} />
              <Spec label="Colección" value={collection?.name ?? mainCategory?.name ?? "General"} href={collection ? `/tienda?cat=${collection.slug}` : mainCategory ? `/tienda?cat=${mainCategory.slug}` : undefined} />
              <Spec label="Código" value={product.legacyId ? `TW-${product.legacyId}` : `TW-${product.id.slice(-6).toUpperCase()}`} mono />
              <Spec label="Estado" value="Nuevo en blíster" icon={BlisterIcon} className="col-span-2 sm:col-span-2" />
            </dl>
          </section>
        </div>
      </div>

      <Suspense fallback={<RelatedSkeleton />}>
        <Related productId={product.id} categoryIds={product.categories.map((c) => c.id)} brand={product.brand} soldOut={soldOut} mainCategory={mainCategory} />
      </Suspense>

      <RecentlyViewed currentId={product.id} className="mt-16 md:mt-20" />
    </div>
  );
}

async function Related({ productId, categoryIds, brand, soldOut, mainCategory }: { productId: string; categoryIds: string[]; brand: string | null; soldOut: boolean; mainCategory: { slug: string; name: string } | null }) {
  const related = await getRelatedProducts(productId, categoryIds, brand, 8);
  if (!related.length) return null;
  return (
    <section id="relacionados" className="mt-16 scroll-mt-28 md:mt-20" aria-labelledby="related-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <span className="eyebrow">{soldOut ? "Alternativas disponibles" : "También te puede gustar"}</span>
          <h2 id="related-title" className="mt-1 text-2xl sm:text-3xl">
            {soldOut ? "Modelos parecidos con stock" : "Productos relacionados"}
          </h2>
        </div>
        {mainCategory ? (
          <Link href={`/tienda?cat=${mainCategory.slug}`} className="btn-ghost btn-sm shrink-0 text-lime-700">
            Ver más
          </Link>
        ) : null}
      </div>
      <ProductGrid products={related} priorityCount={0} />
    </section>
  );
}

function RelatedSkeleton() {
  return (
    <div className="mt-16 md:mt-20" aria-hidden>
      <div className="h-3 w-32 animate-pulse rounded bg-ink-100" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded-lg bg-ink-100" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[3/4] animate-pulse bg-ink-50" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-4/5 animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spec({ label, value, href, mono, icon: Icon, className }: { label: string; value: string; href?: string; mono?: boolean; icon?: React.ComponentType<{ className?: string }>; className?: string }) {
  return (
    <div className={`bg-white px-4 py-3 ${className ?? ""}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className={`mt-0.5 flex items-center gap-1.5 font-semibold ${mono ? "tabular-nums" : ""}`}>
        {Icon ? <Icon className="size-4 shrink-0 text-lime-700" /> : null}
        {href ? (
          <Link href={href} className="decoration-lime decoration-2 underline-offset-4 hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
