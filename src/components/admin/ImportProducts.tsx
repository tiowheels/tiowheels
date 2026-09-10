"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/format";
import { importarProductos, type ImportResult } from "@/app/admin/(panel)/productos/importar/actions";

export function ImportProducts() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [archivo, setArchivo] = useState<string | null>(null);
  const [res, setRes] = useState<ImportResult | null>(null);

  function enviar(modo: "revisar" | "aplicar") {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    fd.set("modo", modo === "aplicar" ? "aplicar" : "revisar");
    setRes(null);
    start(async () => {
      const r = await importarProductos(fd);
      setRes(r);
      if (r.ok && r.aplicado) router.refresh();
    });
  }

  const resumen = res?.ok ? res.totales : null;
  const hayCambios = resumen ? resumen.crear + resumen.actualizar > 0 : false;

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          enviar("revisar");
        }}
        className="card p-4 md:p-5"
      >
        <label htmlFor="archivo" className="label">
          Archivo CSV
        </label>
        <input
          id="archivo"
          name="archivo"
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(e) => {
            setArchivo(e.target.files?.[0]?.name ?? null);
            setRes(null);
          }}
          className="block w-full text-sm text-ink-600 file:mr-3 file:h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-ink file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-700"
        />
        {archivo && (
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-600">
            <FileSpreadsheet className="size-4 text-lime-700" /> {archivo}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="btn-primary btn-md">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Revisar archivo
          </button>
          {res?.ok && !res.aplicado && hayCambios && (
            <button type="button" disabled={pending} onClick={() => enviar("aplicar")} className="btn-lime btn-md">
              <CheckCircle2 className="size-4" /> Aplicar {resumen!.crear + resumen!.actualizar} cambios
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-ink-500">Primero se revisa y se muestra qué va a pasar. Nada se guarda hasta que confirmes.</p>
      </form>

      {res && !res.ok && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {res.error}
        </p>
      )}

      {res?.ok && (
        <div className="space-y-4">
          <div className={cn("rounded-card p-4 md:p-5", res.aplicado ? "bg-success/10" : "bg-ink-50")}>
            <p className="text-sm font-bold">{res.aplicado ? "Cambios aplicados" : "Vista previa"}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato n={res.totales.crear} label={res.aplicado ? "creados" : "por crear"} tono="lime" />
              <Dato n={res.totales.actualizar} label={res.aplicado ? "actualizados" : "por actualizar"} tono="ink" />
              <Dato n={res.totales.sinCambios} label="sin cambios" tono="ink" />
              <Dato n={res.totales.errores} label="con error" tono={res.totales.errores ? "danger" : "ink"} />
            </div>
            <p className="mt-3 text-xs text-ink-500">
              Columnas que se usarán: <b>{res.columnas.join(", ") || "ninguna"}</b>. Las que no vengan en el archivo no se tocan.
            </p>
            {res.nuevasCategorias.length > 0 && (
              <p className="mt-1 text-xs text-ink-500">
                Categorías nuevas: <b>{res.nuevasCategorias.join(", ")}</b>
              </p>
            )}
            {res.nuevasEtiquetas.length > 0 && (
              <p className="mt-1 text-xs text-ink-500">
                Etiquetas nuevas: <b>{res.nuevasEtiquetas.join(", ")}</b>
              </p>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="max-h-[26rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-3 py-2">Línea</th>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Acción</th>
                    <th className="px-3 py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {res.filas.slice(0, 300).map((f) => (
                    <tr key={f.linea} className={cn(f.accion === "error" && "bg-danger/5")}>
                      <td className="px-3 py-2 tabular-nums text-ink-400">{f.linea}</td>
                      <td className="px-3 py-2 font-medium">{f.nombre}</td>
                      <td className="px-3 py-2">
                        <Accion accion={f.accion} />
                      </td>
                      <td className="px-3 py-2 text-ink-500">{f.detalle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {res.filas.length > 300 && <p className="border-t border-ink-100 px-3 py-2 text-xs text-ink-500">Se muestran las primeras 300 de {res.filas.length} filas.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Dato({ n, label, tono }: { n: number; label: string; tono: "lime" | "ink" | "danger" }) {
  const color = tono === "lime" ? "text-lime-700" : tono === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className={cn("text-xl font-bold tabular-nums", color)}>{n}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
    </div>
  );
}

function Accion({ accion }: { accion: "crear" | "actualizar" | "sin cambios" | "error" }) {
  if (accion === "crear")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-lime-50 px-1.5 py-0.5 text-[11px] font-bold text-lime-700">
        <Plus className="size-3" /> Crear
      </span>
    );
  if (accion === "actualizar")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold text-ink-700">
        <RefreshCw className="size-3" /> Actualizar
      </span>
    );
  if (accion === "error")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-1.5 py-0.5 text-[11px] font-bold text-danger">
        <AlertCircle className="size-3" /> Error
      </span>
    );
  return <span className="text-[11px] font-semibold text-ink-400">Sin cambios</span>;
}
