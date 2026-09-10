import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { normalizeText, formatCLP } from "./format";
import { mediaUrl } from "./media-url";
import { SITE } from "./site";

/**
 * Asistente de la tienda ("el Tío"). No usa servicios externos: entiende la intención del
 * mensaje y responde con datos reales del catálogo, así siempre muestra precios y stock al día.
 */

export type ChatProduct = { slug: string; name: string; price: number; image: string; stock: number; brand: string | null };
export type ChatReply = {
  text: string;
  products?: ChatProduct[];
  link?: { href: string; label: string };
  suggestions?: string[];
};

const SUGERENCIAS_BASE = ["Ver Hot Wheels premium", "¿Cómo son los envíos?", "¿Puedo retirar?", "Medios de pago"];

/** Palabras que no aportan a la búsqueda de un auto. */
const RELLENO = new Set([
  "hola","buenas","buenos","dias","tardes","noches","quiero","quisiera","busco","buscando","necesito","tienes","tienen","tiene","hay","me","muestra","muestrame","mostrar","ver","veo","los","las","el","la","un","una","unos","unas","de","del","por","para","favor","que","cuales","cuanto","cuanta","auto","autos","autito","autitos","modelo","modelos","coche","coches","carro","carros","algun","alguna","stock","disponible","disponibles","precio","precios","vale","valen","tienda","porfa","porfavor","gracias","si","no","y","o","con","sin","mas","ademas","tipo","marca","hotwheels","hot","wheels",
]);

function limpiar(texto: string) {
  return normalizeText(texto)
    .split(" ")
    .filter((p) => p.length >= 2 && !RELLENO.has(p))
    .join(" ")
    .trim();
}

const contiene = (t: string, palabras: string[]) => palabras.some((p) => t.includes(p));

export async function responder(mensaje: string): Promise<ChatReply> {
  const bruto = normalizeText(mensaje);
  if (!bruto) return saludo();

  // Saludos y cortesía
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|holi)\b/.test(bruto) && bruto.length < 30) return saludo();
  if (contiene(bruto, ["gracias", "muchas gracias", "genial", "perfecto"]) && bruto.length < 30) {
    return { text: "¡De nada! Si necesitas algo más, aquí estoy. 🏁", suggestions: SUGERENCIAS_BASE };
  }

  // Preguntas frecuentes
  if (contiene(bruto, ["envio", "envios", "despacho", "despachan", "llega", "starken", "blue", "courier", "cuanto demora", "demora"])) {
    return {
      text: "Despachamos a todo Chile por Blue Express o Starken. El envío es **por pagar**: el costo lo cancelas al courier cuando recibes. Preparamos el pedido en 1 a 3 días hábiles y la entrega demora entre 2 y 7 días hábiles según la comuna.",
      suggestions: ["¿Puedo retirar?", "Medios de pago", "Ver novedades"],
    };
  }
  if (contiene(bruto, ["retiro", "retirar", "buscar el pedido", "pasar a buscar", "presencial"])) {
    return {
      text: "Sí, el retiro es gratis en **Metro El Llano** o en nuestra dirección comercial. Eliges retiro al finalizar la compra y coordinamos día y hora por WhatsApp.",
      suggestions: ["¿Cómo son los envíos?", "Medios de pago"],
    };
  }
  if (contiene(bruto, ["pago", "pagar", "pagos", "transferencia", "webpay", "tarjeta", "flow", "credito", "debito", "cuotas"])) {
    return {
      text: "Puedes pagar con **Flow** (Webpay, tarjetas de crédito y débito) o por **transferencia bancaria**. Con transferencia te enviamos los datos al confirmar el pedido y lo despachamos apenas se acredita.",
      suggestions: ["¿Cómo son los envíos?", "Ver Hot Wheels premium"],
    };
  }
  if (contiene(bruto, ["mi pedido", "mi compra", "seguimiento", "rastrear", "rastreo", "donde va", "estado del pedido", "numero de seguimiento"])) {
    return {
      text: "Para ver tu pedido usa el enlace que te llegó por correo al comprar. Si tienes cuenta, también está en «Mi cuenta». Cuando lo despachamos te enviamos el courier y el número de seguimiento.",
      link: { href: "/cuenta", label: "Ir a mi cuenta" },
      suggestions: ["Hablar por WhatsApp"],
    };
  }
  if (contiene(bruto, ["horario", "atienden", "abierto", "cuando atienden"])) {
    return { text: "La tienda vende 24/7. Las consultas por WhatsApp las respondemos durante el día, y los pedidos se preparan de lunes a viernes.", suggestions: SUGERENCIAS_BASE };
  }
  if (contiene(bruto, ["cambio", "devolucion", "devolver", "garantia", "arrepentimiento"])) {
    return {
      text: "Tienes 10 días desde que recibes para pedir cambio o devolución, siempre que el auto venga sin abrir y en su blíster. Escríbenos y lo coordinamos.",
      link: { href: "/terminos", label: "Ver términos y condiciones" },
      suggestions: ["Hablar por WhatsApp"],
    };
  }
  if (contiene(bruto, ["whatsapp", "telefono", "hablar con alguien", "persona", "humano", "contacto", "correo", "mail"])) {
    return {
      text: `Puedes escribirnos por WhatsApp al ${SITE.phone} o a ${SITE.email}. Con gusto te ayudamos.`,
      link: { href: `https://wa.me/${SITE.whatsapp}`, label: "Abrir WhatsApp" },
    };
  }
  if (contiene(bruto, ["original", "originales", "replica", "falso", "nuevo", "usado", "blister"])) {
    return {
      text: "Todos nuestros autos son originales y se venden nuevos, sellados en su blíster, salvo que la ficha diga lo contrario. Escala 1:64.",
      suggestions: ["Ver Hot Wheels premium", "Ver novedades"],
    };
  }

  // Novedades
  if (contiene(bruto, ["novedad", "novedades", "nuevo ingreso", "ultimos", "recien llegado", "lo nuevo"])) {
    const productos = await buscarPorSql(Prisma.sql`p."status" = 'ACTIVE' AND p."stock" > 0`, Prisma.sql`p."listedAt" DESC`);
    return { text: "Esto es lo último que subimos a la tienda:", products: productos, link: { href: "/tienda?orden=nuevo", label: "Ver todas las novedades" }, suggestions: SUGERENCIAS_BASE };
  }

  // Búsqueda en el catálogo
  const consulta = limpiar(bruto);
  if (!consulta) return saludo();

  // ¿Es una marca? ("mercedes" → Mercedes-Benz)
  const marca = await buscarMarca(consulta);
  if (marca) {
    const [productos, total] = await Promise.all([
      buscarPorSql(Prisma.sql`p."status" = 'ACTIVE' AND p."stock" > 0 AND p."brand" = ${marca}`, Prisma.sql`p."listedAt" DESC`),
      db.product.count({ where: { status: "ACTIVE", stock: { gt: 0 }, brand: marca } }),
    ]);
    if (total > 0) {
      return {
        text: `Tenemos **${total} ${total === 1 ? "auto" : "autos"} ${marca}** con stock. Te muestro algunos:`,
        products: productos,
        link: { href: `/tienda?marca=${encodeURIComponent(marca)}`, label: `Ver los ${total} ${marca}` },
        suggestions: ["Ver Hot Wheels premium", "¿Cómo son los envíos?"],
      };
    }
  }

  // ¿Es una categoría? ("premium", "japoneses", "treasure hunt")
  const categoria = await buscarCategoria(consulta);
  if (categoria) {
    const [productos, total] = await Promise.all([
      buscarPorSql(Prisma.sql`p."status" = 'ACTIVE' AND p."stock" > 0 AND EXISTS (SELECT 1 FROM "_CategoryToProduct" cp WHERE cp."B" = p."id" AND cp."A" = ${categoria.id})`, Prisma.sql`p."listedAt" DESC`),
      db.product.count({ where: { status: "ACTIVE", stock: { gt: 0 }, categories: { some: { id: categoria.id } } } }),
    ]);
    if (total > 0) {
      return {
        text: `En **${categoria.name}** tenemos ${total} ${total === 1 ? "auto disponible" : "autos disponibles"}:`,
        products: productos,
        link: { href: `/tienda?cat=${categoria.slug}`, label: `Ver ${categoria.name}` },
        suggestions: ["¿Cómo son los envíos?", "Medios de pago"],
      };
    }
  }

  // Búsqueda por texto
  const terminos = consulta.split(" ").filter((t) => t.length >= 2);
  const conds = terminos.map((t) => Prisma.sql`p."searchText" ILIKE ${"%" + t + "%"}`);
  const where = Prisma.sql`p."status" = 'ACTIVE' AND p."stock" > 0 AND ${Prisma.join(conds, " AND ")}`;
  const productos = await buscarPorSql(where, Prisma.sql`similarity(p."name", ${consulta}) DESC, p."listedAt" DESC`);
  if (productos.length) {
    const total = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "Product" p WHERE ${where}`;
    const n = Number(total[0]?.n ?? productos.length);
    return {
      text: n > productos.length ? `Encontré **${n} autos** para «${consulta}». Estos son algunos:` : `Esto es lo que tengo para «${consulta}»:`,
      products: productos,
      link: { href: `/tienda?q=${encodeURIComponent(consulta)}`, label: n > productos.length ? `Ver los ${n} resultados` : "Ver en la tienda" },
      suggestions: ["¿Cómo son los envíos?", "Medios de pago"],
    };
  }

  // Sin resultados: se ofrecen alternativas reales
  const marcas = await db.product.groupBy({ by: ["brand"], where: { status: "ACTIVE", stock: { gt: 0 }, brand: { not: null } }, _count: { _all: true }, orderBy: { _count: { brand: "desc" } }, take: 6 });
  return {
    text: `No encontré nada para «${consulta}». Puede que esté agotado o que se llame distinto. Prueba con una marca, por ejemplo:`,
    link: { href: "/tienda", label: "Ver todo el catálogo" },
    suggestions: marcas.map((m) => m.brand!).filter(Boolean),
  };
}

function saludo(): ChatReply {
  return {
    text: "¡Hola! Soy el Tío 👋 Dime qué auto buscas (una marca, un modelo o una colección) y te muestro lo que tengo con stock.",
    suggestions: ["Mercedes", "Nissan Skyline", "Ver Hot Wheels premium", "¿Cómo son los envíos?"],
  };
}

async function buscarPorSql(where: Prisma.Sql, order: Prisma.Sql, take = 6): Promise<ChatProduct[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT p."id" FROM "Product" p WHERE ${where} ORDER BY ${order} LIMIT ${take}`;
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [];
  const productos = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, name: true, price: true, stock: true, brand: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } },
  });
  const porId = new Map(productos.map((p) => [p.id, p]));
  return ids
    .map((id) => porId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ slug: p.slug, name: p.name, price: p.price, stock: p.stock, brand: p.brand, image: mediaUrl(p.images[0]?.path, "thumb") }));
}

/** Encuentra la marca aunque se escriba corto o sin tilde: "mercedes" → "Mercedes-Benz". */
async function buscarMarca(consulta: string): Promise<string | null> {
  const marcas = await db.product.groupBy({ by: ["brand"], where: { status: "ACTIVE", stock: { gt: 0 }, brand: { not: null } }, _count: { _all: true } });
  const lista = marcas.map((m) => ({ nombre: m.brand!, norm: normalizeText(m.brand!), n: m._count._all })).sort((a, b) => b.n - a.n);
  const exacta = lista.find((m) => m.norm === consulta);
  if (exacta) return exacta.nombre;
  const palabras = consulta.split(" ");
  const parcial = lista.find((m) => palabras.some((p) => p.length >= 3 && (m.norm.startsWith(p) || m.norm.split(/[\s-]/).includes(p))));
  return parcial?.nombre ?? null;
}

async function buscarCategoria(consulta: string) {
  const cats = await db.category.findMany({ select: { id: true, name: true, slug: true } });
  const lista = cats.map((c) => ({ ...c, norm: normalizeText(c.name) }));
  return lista.find((c) => c.norm === consulta) ?? lista.find((c) => c.norm.includes(consulta) && consulta.length >= 4) ?? null;
}

export function precioTexto(p: ChatProduct) {
  return formatCLP(p.price);
}
