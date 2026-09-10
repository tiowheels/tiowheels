# Tío Wheels — ecommerce (Next.js 16 + Prisma 7 + Postgres)

Rebuild de https://tiowheels.cl (autos a escala Hot Wheels, Chile). Todo en español de Chile. Moneda CLP sin decimales.

## Stack y convenciones
- **Next.js 16 App Router** (`src/app`), React 19, TypeScript estricto, Tailwind v4 (tokens en `src/app/globals.css`).
  - Middleware se llama `src/proxy.ts`. `params`/`searchParams` son **Promise** (hay que `await`).
  - Server Actions en archivos `actions.ts` con `"use server"`; validar con **zod**.
  - Route handlers: `src/app/api/**/route.ts`. Los `params` también son Promise.
- **Prisma 7** con adapter pg: importar SIEMPRE `db` desde `@/lib/db` (nunca instanciar PrismaClient). Enums re-exportados desde `@/lib/db`. Tipos desde `@/generated/prisma/client`.
- **Auth** propia (JWT en cookie `tw_session`): `getCurrentUser()`, `requireUser()`, `requireAdmin()`, `createSession()`, `authenticate()` en `@/lib/auth` (solo servidor).
- **Imágenes**: se guardan en disco (`storage/media`, volumen Railway) y se sirven desde `/media/...`. Usar `mediaUrl(path, "thumb"|"medium"|"large")` de `@/lib/media-url` (cliente y servidor). Subidas: `storeProductImage()` en `@/lib/media` (solo servidor). Usar `<img>` normal, no `next/image`.
- **Catálogo/búsqueda**: `@/lib/catalog` → `searchProducts(filters)` (pg_trgm, facets), `quickSearch`, `getProductBySlug`, `getCategoryTree`, `parseFilters(searchParams)`. Al modificar productos, actualizar `searchText` con `normalizeText(nombre + marca + descripción + categorías)`.
- **Carrito**: cliente, `useCart()` de `@/components/cart/CartProvider` (localStorage). El checkout revalida precios y stock en servidor.
- **Pagos**: `@/lib/flow` (`flowConfigured()`, `createFlowPayment`, `getFlowStatus`). Sin claves Flow, ofrecer solo transferencia. Flow status 2 = pagada.
- **Correo**: `sendMail()` de `@/lib/mail` (no falla si no hay SMTP).
- **Utilidades**: `cn`, `formatCLP`, `formatDate`, `normalizeText`, `slugify`, `formatRut`, `validateRut` en `@/lib/format`. Regiones/comunas en `@/lib/chile`. Datos de la tienda en `@/lib/site`.
- **UI**: clases utilitarias en globals.css: `btn-primary|btn-lime|btn-outline|btn-ghost` + `btn-sm|btn-md|btn-lg`, `input`, `label`, `card`, `chip`/`chip-active`, `eyebrow`, `container-x`. Componentes en `src/components/ui` (Price, Badge, QuantityStepper, BrandIcons), `src/components/product` (ProductCard, ProductGrid), `src/components/site` (Header, Footer, SearchBox). Iconos: `lucide-react` v1 (sin iconos de marcas; usar BrandIcons).
- Diseño: Montserrat, negro `ink` + blanco + verde lima `lime` (#b0d800) como acento; naranja `flame`, rojo `danger`. Bordes redondeados grandes (`rounded-card`), sombras suaves. Mobile-first; el admin debe ser cómodo en celular (PWA).

## Rutas
- Tienda: `(site)/` portada, `/tienda` (búsqueda + filtros por query string: q, cat, marca, min, max, disp=todo, orden, page), `/producto/[slug]`, `/carrito`, `/checkout`, `/pedido/[id]`, `/nosotros`, `/contacto`, `/terminos`, `/privacidad`, `/cuenta/*`.
- Admin: `/admin/*` (layout propio, sin Header/Footer de la tienda). Login en `/admin/login`.
- Pagos: `/api/flow/confirm` (POST de Flow), `/api/flow/return` (POST → redirect a `/pedido/[id]`).

## Datos
- Importados de WooCommerce: `data/legacy/*.json` (no versionados). Scripts en `scripts/` (`import-legacy.ts`, `process-images.ts`, `make-icons.ts`).
- Pedidos legados conservan su número (`Order.number`); los nuevos empiezan en 40000. `Order.channel` distingue WEB / MANUAL (venta rápida) / LEGACY_*.

## Comandos
- `pnpm dev` · `pnpm build` · `pnpm tsc --noEmit` · `pnpm prisma migrate dev` · `pnpm prisma db seed` (ADMIN_PASSWORD requerido).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
