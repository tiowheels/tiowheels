# Despliegue en Railway

Un proyecto Railway con 2 servicios: **Postgres** y **web** (este repo, Dockerfile). Las imágenes viven en **Cloudflare R2** (no hace falta volumen).

## 0. Cloudflare R2 (una vez)
1. En Cloudflare → R2 → Create bucket: `tiowheels-media` (ubicación automática).
2. Bucket → Settings → Public access: habilitar el subdominio `r2.dev` o conectar un dominio propio (recomendado `media.tiowheels.cl`, se crea solo el CNAME si el DNS está en Cloudflare).
3. R2 → Manage R2 API Tokens → Create API token: permisos "Object Read & Write" solo para ese bucket. Guardar Access Key ID y Secret Access Key. El Account ID aparece en la barra lateral de R2.
4. Poner las 4 variables `R2_*` y `NEXT_PUBLIC_MEDIA_BASE_URL` en `.env` local y subir las fotos ya optimizadas (3,6 GB, reanudable):
```bash
pnpm images:upload-r2
```
Al terminar verifica contra la BD que no falte ninguna variante.

## 1. Crear servicios
```bash
railway init            # crea el proyecto (o railway link a uno existente)
railway add --database postgres
railway add --service web
```

## 2. Variables del servicio web
| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al servicio Postgres) |
| `AUTH_SECRET` | cadena aleatoria larga (`openssl rand -base64 48`) |
| `NEXT_PUBLIC_SITE_URL` | `https://tiowheels.cl` (o el dominio de Railway mientras tanto) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | credenciales de Cloudflare R2 (bucket `tiowheels-media`) |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | dominio público del bucket, ej. `https://media.tiowheels.cl` (se fija en build) |
| `FLOW_API_KEY` / `FLOW_SECRET_KEY` | claves de Flow (sandbox primero) |
| `FLOW_API_URL` | `https://sandbox.flow.cl/api` → en producción `https://www.flow.cl/api` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | opcional, para correos de pedido |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | para `pnpm db:seed` |
| `NEXT_PUBLIC_META_PIXEL_ID` | opcional, id del Meta Pixel (el sitio anterior usaba `1339077757161490`). Sin ella no se carga el píxel |
| `NEXT_PUBLIC_GA_ID` | opcional, ID de medición de Google Analytics 4 (`G-XXXXXXXXXX`). Sin ella no se carga GA |

Eventos que se envían cuando la analítica está activa: PageView/page_view (cada ruta), ViewContent/view_item (ficha), AddToCart/add_to_cart, InitiateCheckout/begin_checkout (al entrar a `/checkout`) y Purchase/purchase (página del pedido, una vez por pedido). Las variables `NEXT_PUBLIC_*` se fijan en build, así que hay que redeployar al cambiarlas.

## 3. Deploy
```bash
railway up --service web
```
El contenedor ejecuta `prisma migrate deploy` al arrancar.

## 4. Migrar la base de datos local → Railway (una vez)
```bash
pg_dump -h localhost -d tiowheels --no-owner --no-privileges -Fc -f tiowheels.dump
pg_restore --no-owner --no-privileges -d "$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL)" tiowheels.dump
```

## 5. Imágenes en producción
Ya están en R2 (paso 0). Las fotos nuevas que se suban desde el panel van directo a R2. Si alguna vez faltara una variante y el sitio antiguo siguiera en línea, `pnpm images:rehydrate` la regenera desde `ProductImage.sourceUrl`.

## 6. Dominio
En Railway → web → Settings → Domains, agregar `tiowheels.cl` y `www.tiowheels.cl`, y apuntar el DNS (CNAME) según indique Railway. Las URLs antiguas de WooCommerce redirigen con 301 (ver `next.config.ts`).

## 7. Flow en producción
En el panel de Flow, configurar las claves de producción y cambiar `FLOW_API_URL`. Las URLs de confirmación/retorno se envían en cada pago (`/api/flow/confirm` y `/api/flow/return`), no requieren configuración en Flow.
