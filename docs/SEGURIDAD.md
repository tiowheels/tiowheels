# Auditoría de seguridad · Tío Wheels

Fecha: 2026-09-08 · Alcance: código de la aplicación (Next.js 16 + Prisma 7 + Postgres), configuración de despliegue y dependencias. No incluye pruebas de intrusión sobre infraestructura de Railway ni revisión de la cuenta Flow.

## Resumen

| Severidad | Encontradas | Corregidas | Pendientes (requieren decisión o infraestructura) |
|---|---|---|---|
| Alta | 3 | 3 | 0 |
| Media | 6 | 6 | 0 |
| Baja | 6 | 5 | 1 |

Estado general tras la auditoría: **bueno**. Actualizado 2026-09-08 tras cerrar el punto 13. La arquitectura ya tenía las bases correctas (precios y stock calculados en servidor, validación con zod, consultas parametrizadas, contraseñas con bcrypt, cookies httpOnly, admin protegido en cada acción). Los hallazgos fueron de endurecimiento, no de fallas estructurales.

## Hallazgos y correcciones

### Alta

1. **Sin límite de intentos en login (admin y clientes), registro y recuperación de contraseña.** Permitía fuerza bruta contra la cuenta administradora.
   *Corregido:* limitador por IP y por email (`src/lib/rate-limit.ts`). Admin: 5 intentos por email y 10 por IP cada 15 min. Clientes: 8 por email y 20 por IP. Recuperación: 3 por email y 5 por IP por hora. Registro: 5 por IP por hora.
2. **Sin cabeceras de seguridad HTTP** (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
   *Corregido:* configuradas en `next.config.ts`. CSP restringe scripts, conexiones e iframes al propio dominio y a Flow; `frame-ancestors 'none'` evita clickjacking. HSTS solo en producción. `/admin`, `/cuenta` y `/pedido` con `Cache-Control: no-store` y `noindex`.
3. **Las sesiones no se invalidaban al cambiar o restablecer la contraseña** (JWT de 30 días sin revocación). Un dispositivo comprometido seguía con acceso.
   *Corregido:* campo `User.sessionVersion` incluido en el JWT y verificado en cada petición. Cambiar o restablecer la contraseña incrementa la versión y cierra todas las demás sesiones.

### Media

4. **Tokens de recuperación de contraseña guardados en claro en la base de datos.** Con acceso de lectura a la BD se podían usar.
   *Corregido:* se guarda solo el hash SHA-256; el enlace del correo lleva el token original.
5. **Webhook de Flow no verificaba el monto pagado** contra el del intento de pago.
   *Corregido:* si el monto que informa Flow difiere del registrado, el pago queda marcado como `mismatch`, el pedido no se marca pagado y se registra en el log.
6. **Subida de imágenes sin límite de tamaño ni cantidad**, y tipo validado solo por el `Content-Type` que envía el cliente.
   *Corregido:* máximo 12 archivos por guardado y 15 MB cada uno, lista blanca de tipos (jpeg, png, webp, heic, avif, gif). Además, todas las imágenes se re-codifican con sharp a webp, lo que elimina metadatos y contenido no imagen.
7. **Formularios públicos (contacto, newsletter) sin protección contra spam** y sin límite de longitud.
   *Corregido:* límite por IP (3 mensajes/hora, 5 suscripciones/hora), campo trampa (honeypot) y máximos de longitud.
8. **Secreto de sesión débil aceptado en producción.**
   *Corregido:* en producción la app rechaza arrancar si `AUTH_SECRET` tiene menos de 32 caracteres o parece un valor de ejemplo.
9. **JSON-LD en la ficha de producto sin escapar `<`**: un nombre de producto con `</script>` podía cerrar la etiqueta (solo editable por administradores, pero es XSS almacenado).
   *Corregido:* se escapan `<`, `>` y `&` en el JSON incrustado.

### Baja

10. **Resolución de rutas en `/media`** se apoyaba en `normalize` + `startsWith`. No era explotable (se probó con `..`, `%2e%2e`, `%2F` y barras invertidas), pero era frágil.
    *Corregido:* cada segmento se valida con lista blanca de caracteres y se rechazan `..`, vacíos y rutas de más de 8 niveles.
11. **API pública de búsqueda sin límite** (posible abuso de CPU).
    *Corregido:* 120 peticiones por minuto por IP, término limitado a 80 caracteres.
12. **Dependencias con avisos** (6 avisos: lodash, deepmerge-ts, mysql2). Todos están en dependencias transitivas del **CLI de Prisma** (Studio, driver MySQL), no del código que ejecuta la tienda. No hay ruta de explotación en runtime.
    *Pendiente:* actualizar Prisma cuando salga la versión estable que los resuelva (hoy la única superior es 8.0.0-rc). Revisar con `pnpm audit --prod` en cada despliegue.
13. **Página de pedido accesible con el enlace** (`/pedido/<id>`). El id es un cuid de 25 caracteres, no adivinable, pero exponía dirección y teléfono a quien tuviera el enlace.
    *Corregido:* el detalle completo solo se muestra al dueño con sesión, al navegador que hizo la compra (cookie firmada `tw_orders`) o tras verificar el email del comprador (5 intentos por IP cada 15 min). Sin eso se ve solo número, estado y línea de tiempo.
14. **Clave de API de WooCommerce del sitio antiguo** guardada en `.env.legacy` (ignorado por git).
    *Pendiente (acción del cliente):* revocarla en WooCommerce › Ajustes › Avanzado › REST API al terminar la migración.
15. **Cookie de sesión sin prefijo `__Host-`**. Añadirlo impediría que un subdominio la sobrescriba, pero rompe el desarrollo local por HTTP. Riesgo bajo mientras tiowheels.cl no tenga subdominios de terceros.

## Lo que ya estaba bien

- Precios, totales y stock se calculan en el servidor a partir de la base de datos; el carrito del cliente solo envía ids y cantidades. Descuento de stock condicional dentro de una transacción (sin sobreventa por compras simultáneas).
- Todas las Server Actions del panel llaman a `requireAdmin()`; el `proxy.ts` redirige antes de renderizar; la API interna del panel responde 401 sin sesión.
- Consultas SQL directas construidas con `Prisma.sql` (parametrizadas); sin `queryRawUnsafe` en la aplicación.
- Contraseñas con bcrypt (coste 10); recuperación con respuesta idéntica exista o no el email (sin enumeración).
- Redirección `next` restringida a rutas internas (sin open redirect).
- Cookies `httpOnly`, `SameSite=Lax`, `Secure` en producción. Server Actions de Next con verificación de origen (CSRF).
- Correos HTML con escape de datos del cliente. `X-Powered-By` desactivado. Robots bloquea `/admin`, `/api`, `/checkout`, `/cuenta`, `/pedido`.
- Firma HMAC-SHA256 de Flow verificada contra la documentación; el webhook consulta el estado a Flow en vez de confiar en el cuerpo recibido; idempotente.

## Recomendaciones para producción (Railway)

1. Generar `AUTH_SECRET` con `openssl rand -base64 48` y no reutilizarlo en otros proyectos.
2. Cambiar la contraseña inicial del administrador desde Ajustes al primer ingreso.
3. Activar copias de seguridad automáticas de Postgres en Railway y probar una restauración.
4. Usar las claves de Flow de **producción** solo en las variables de Railway, nunca en archivos del repositorio.
5. Si el sitio pasa a más de una instancia, mover el limitador de intentos a Redis (hoy es en memoria por instancia).
6. Revisar `pnpm audit --prod` y actualizar Next y Prisma con cada despliegue mensual.
7. Revocar la clave de la API de WooCommerce y dar de baja el sitio antiguo tras el cambio de DNS.
