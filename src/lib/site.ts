/** Datos de la tienda (mantenidos del sitio anterior). */
export const SITE = {
  name: "Tío Wheels",
  legalName: "Tío Wheels Toys",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://tiowheels.cl",
  description:
    "Tienda de autos a escala Hot Wheels, Matchbox y más. Más de 3.500 modelos, envíos a todo Chile, ventas 24/7 y atención al cliente.",
  tagline: "¡Colecciona la emoción!",
  email: "contacto@tiowheels.cl",
  phone: "+56 9 4432 9903",
  whatsapp: "56944329903",
  instagram: "https://www.instagram.com/tiowheels/",
  facebook: "https://www.facebook.com/tio.wheels.toys/",
  mission:
    "Nuestra misión es conectar a los amantes de los autos a escala a través de piezas únicas y especiales que cuentan historias. Nos esforzamos por ofrecer una experiencia de compra excepcional, con envíos seguros y atención a los detalles. Cada auto no solo es un producto, sino una muestra de nuestra pasión por el coleccionismo y nuestro compromiso de hacer que cada cliente viva momentos memorables.",
  vision:
    "Ser la marca líder en venta de autos a escala, reconocida por nuestra confianza, cercanía y entrega segura. Queremos que cada cliente, sin importar su edad o experiencia, se sienta respaldado y acompañado por el 'Tío' que siempre sabe lo que hace, creando una comunidad en la que la diversión, la seguridad y la experiencia sean siempre lo primero.",
  benefits: [
    { title: "Envíos a todo Chile", text: "Despachamos por Blue Express o Starken, envío por pagar." },
    { title: "Más de 3.500 productos", text: "Básicos, premium, tarjetas especiales y ediciones limitadas." },
    { title: "Ventas 24/7", text: "Compra a cualquier hora, pago seguro en línea." },
    { title: "Atención al cliente", text: "Te acompañamos por WhatsApp antes y después de tu compra." },
  ],
  hero: {
    lines: ["¡Colecciona la emoción!", "Encuentra los mejores modelos aquí", "Velocidad y adrenalina en miniatura", "¡Descubre tu próximo favorito!"],
  },
} as const;

export const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/tienda", label: "Tienda" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
] as const;

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${SITE.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
