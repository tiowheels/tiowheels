# Diagnóstico tiowheels.cl (levantado 2026-09-07)

## Plataforma actual
- WordPress + WooCommerce + Elementor (Pro Elements) + tema Hello Elementor
- Plugins visibles: ajax-search-for-woocommerce, add-search-to-menu, creame-whatsapp-me, google-site-kit
- Pago actual: Transbank Webpay Plus (REST). El checkout tiene restos de un plugin de Flow, pero no está activo como método.
- Envío: Starken con cotización por comuna en checkout.

## Identidad visual
- Tipografía global: **Montserrat** (títulos 700, cuerpo regular).
- Colores del kit Elementor: negro #000000, blanco #FFFFFF, gris #F5F5F5 / #D4D4D4, naranjo #EC9F47, rojo #E93232, magenta #F40260, violeta #8E02F4.
- Logo: `logo_.png` (Tío Wheels Toys, script negro + verde lima ~#B5D82E con banderas a cuadros). El archivo `logo-black.png` es de otra marca (Sneakeri) — descartar.

## Contenido
- Menú: Inicio, Tienda, Nosotros, Contacto, Registro.
- Hero: "¡Colecciona la emoción!" / "Encuentra los mejores modelos aquí" / "Velocidad y adrenalina en miniatura" / "¡Descubre tu próximo favorito!"
- Beneficios: Envíos a todo Chile · Más de 3500 productos · Ventas 24/7 · Atención al cliente
- Secciones home: Productos Recientes, Productos Destacados
- Nosotros: Misión y Visión (texto en products.json no, ver página 620 WP)
- Contacto: formulario (Name, Surname, Email, Message), WhatsApp +56 9 4432 9903, contacto@tiowheels.cl
- Footer: newsletter, misión, Política de Privacidad, Términos y condiciones, Facebook, Instagram
- Términos y condiciones: contiene placeholders sin completar ("[inserta moneda]", "[inserta URL]", etc.)
- Footer tiene texto residual de otra web ("Discover footwear...", "1080 Brickell Ave") — descartar.

## Catálogo (exportado a products.json / categories.json / tags.json)
- 3.722 productos, todos simples (sin variaciones), todos con stock, 7.510 imágenes (~2 por producto)
- 143 categorías (jerárquicas: Americanos > Ford, Chevrolet...; Europeos; Japoneses; Camionetas y Jeeps; Premium; Ediciones limitadas; Fantasía; etc.)
- 87 etiquetas tipo "basicos-N" / "premium-N" (parecen lotes/cajas de inventario)
- Solo 352 productos con descripción; 2 con "(copia)" en el nombre
- Precios CLP sin decimales, rango típico $3.500–$15.000
- Stock: cantidad máxima en add_to_cart.maximum

## Lo que NO se puede extraer sin acceso admin
- Clientes (cuentas), pedidos históricos, cupones, configuración de envío/tarifas Starken.
- Contraseñas de clientes no se migran nunca (hash); requieren restablecer.

## Exportado con API keys (2026-09-07, permiso lectura)
Archivos: customers.json (1.588 usuarios), orders.json (1.367 pedidos), products_v3.json (7.524 productos), shipping_zones.json, payment_gateways.json, settings.json, system_status.json, pages/*.json

### Productos reales: 7.524 (no 3.722)
- 3.722 con stock (visibles) + 3.802 agotados (ocultos por "esconder agotados"). Los agotados están referenciados en pedidos históricos → migrar todos, marcar agotados.
- Sin SKU, sin peso, sin destacados. Stock gestionado por cantidad (0–5 unidades típicamente).
- 1.152 grupos de nombres repetidos (ej. "Datsun 240Z" x18): son piezas distintas del mismo modelo (distinta edición/color). No fusionar.
- Precios $2.000 – $270.000 CLP.

### Pedidos: 1.367 (feb–sep 2026), $34,2M CLP vendidos
- 796 por checkout web (Webpay Plus) + **571 creados desde la app móvil de WooCommerce** (`created_via=rest-api`, attribution `mobile_app`): ventas manuales/presenciales, sin email ni pago registrado. ~70–100 al mes. → El nuevo admin necesita "venta rápida" desde el celular.
- Estados: 1.278 completados, 85 en proceso, 4 cancelados. Sin cupones, sin reseñas, sin impuestos configurados.
- Campo extra en checkout: RUT (`rut_`). Región/comuna estándar WC (CL-RM 60%).
- Envío real: 2 métodos → "Envío por pagar" (gratis, el cliente paga el courier al recibir) y "Retiro" ($0). El selector "Comuna de Starken" es solo informativo. No hay API de Starken.
- Pasarela activa: solo Webpay Plus (Transbank plugin 1.11). Meta de transacción Webpay en cada pedido (authorizationCode, cardNumber, paymentType…).

### Clientes: 1.588 usuarios WP
- 330 rol customer, 1.256 subscriber (registros sin compra), 2 admin. Solo 254 pedidos tienen cliente registrado; 1.113 son invitados.
- Billing casi vacío en perfiles (los datos están en los pedidos).

### Redes / contacto
- Facebook: https://www.facebook.com/tio.wheels.toys/ · Instagram: https://www.instagram.com/tiowheels/ · Pixel Meta 1339077757161490
- WhatsApp +56 9 4432 9903 · contacto@tiowheels.cl
- Hero images: uploads/2025/01/baner1.png, 2025/03/auto_.png, img_8751, img_8818
