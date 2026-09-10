import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { ImportProducts } from "@/components/admin/ImportProducts";

export const metadata: Metadata = { title: "Importar productos" };
export const dynamic = "force-dynamic";

const COLUMNAS: { nombre: string; detalle: string }[] = [
  { nombre: "codigo", detalle: "Identifica el producto a actualizar. Es el que trae la exportación. Déjalo vacío para crear uno nuevo." },
  { nombre: "nombre", detalle: "Obligatorio al crear." },
  { nombre: "precio", detalle: "Obligatorio al crear. En pesos, sin decimales. Acepta 3.500 o 3500." },
  { nombre: "stock", detalle: "Unidades disponibles." },
  { nombre: "marca", detalle: "Marca del auto: Nissan, Ford, Porsche…" },
  { nombre: "precio_anterior", detalle: "Para mostrar un descuento. Vacío lo quita." },
  { nombre: "estado", detalle: "activo, borrador o archivado." },
  { nombre: "destacado", detalle: "si o no." },
  { nombre: "descripcion", detalle: "Texto libre." },
  { nombre: "categorias", detalle: "Nombres separados por | . Las que no existan se crean." },
  { nombre: "etiquetas", detalle: "Los lotes, separados por | . Ej: Básicos 53 | Premium 2." },
];

export default function ImportarProductosPage() {
  return (
    <>
      <PageHeader
        back={{ href: "/admin/productos", label: "Productos" }}
        title="Importar productos"
        description="Sube un CSV para crear productos nuevos o actualizar los que ya existen. Lo más simple es exportar, editar en Excel y volver a subir."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ImportProducts />

        <aside className="space-y-4">
          <section className="card p-4 md:p-5">
            <h2 className="text-base">Cómo funciona</h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-600">
              <li>
                <b>1.</b> Exporta el catálogo desde la lista de productos. El archivo trae la columna <b>codigo</b>, que es la que permite actualizar.
              </li>
              <li>
                <b>2.</b> Edita en Excel o Google Sheets. Puedes borrar las columnas que no quieras cambiar: solo se actualiza lo que venga en el archivo.
              </li>
              <li>
                <b>3.</b> Súbelo aquí, revisa la vista previa y confirma.
              </li>
            </ol>
            <p className="mt-3 text-xs text-ink-500">Las fotos no se importan por archivo: se suben desde la ficha de cada producto.</p>
          </section>

          <section className="card p-4 md:p-5">
            <h2 className="text-base">Columnas</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {COLUMNAS.map((c) => (
                <div key={c.nombre}>
                  <dt className="font-mono text-[13px] font-bold text-ink">{c.nombre}</dt>
                  <dd className="text-xs text-ink-500">{c.detalle}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
