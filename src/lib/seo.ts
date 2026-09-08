/** Helpers de SEO (JSON-LD). Sin dependencias de servidor. */

/** JSON-LD seguro dentro de <script>: escapa < > & para que un nombre no pueda cerrar la etiqueta. */
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
