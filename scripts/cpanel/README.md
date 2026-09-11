# Relevo de correo en el cPanel

Railway no logra conectarse a los puertos de correo del hosting: `mail.tiowheels.cl`
da tiempo de espera agotado tanto en el 465 como en el 587. Por eso la tienda no
puede mandar correos por SMTP y quedaban sin salir las confirmaciones de compra.

La salida es que el correo lo despache el mismo servidor del dominio. `correo.php`
recibe el pedido por HTTPS desde la tienda y lo entrega con el Exim del cPanel, que
ya tiene el SPF y el DKIM del dominio.

## Instalación

1. Abre `correo.php` y cambia la línea de `SECRETO` por una clave larga inventada.
   Sirve cualquier cosa difícil de adivinar, por ejemplo 40 caracteres al azar.
2. Sube el archivo al **Administrador de archivos** del cPanel, dentro de
   `public_html`, con el nombre `correo.php`.
3. En Railway, en el servicio `web`, agrega estas dos variables:

   | Variable | Valor |
   |---|---|
   | `MAIL_RELAY_URL` | `https://tiowheels.cl/correo.php` |
   | `MAIL_RELAY_SECRET` | la misma clave del paso 1 |

4. Entra al panel, a **Ajustes**. La línea "Correo (SMTP)" debe quedar en verde
   diciendo que envía desde el hosting.

## Comprobación desde la terminal

Esto solo pregunta si el archivo está arriba, no envía nada:

```bash
curl -H "X-Tw-Secreto: LA_CLAVE" https://tiowheels.cl/correo.php
```

Respuesta esperada:

```json
{"ok":true,"listo":true,"remitente":"info@tiowheels.cl","php":"8.2.x"}
```

## Detalles

- Los correos salen desde `info@tiowheels.cl` y las respuestas van a `contacto@tiowheels.cl`.
- Sin la clave correcta el archivo responde 401 y no envía nada, así que no sirve
  como relevo de spam para terceros.
- El remitente está fijo en el archivo: aunque alguien conociera la clave, no puede
  hacerse pasar por otro dominio.
- Si el relevo falla y hay SMTP configurado, la tienda intenta igual por SMTP.
- Mientras el sitio antiguo siga en ese hosting, `correo.php` convive sin problema
  con WordPress. Si algún día se apaga ese hosting, hay que mover el relevo al nuevo
  servidor de correo o cambiar a un servicio tipo Resend.
