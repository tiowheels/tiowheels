/**
 * Lectura y escritura de CSV para importar/exportar productos.
 * Pensado para abrirse en Excel en español: separador ";" y BOM UTF-8.
 * Al leer se acepta tanto ";" como "," y se detecta solo.
 */

export function detectSeparator(text: string): ";" | "," | "\t" {
  const head = text.slice(0, 5000).split(/\r?\n/)[0] ?? "";
  const cuenta = (c: string) => head.split(c).length - 1;
  const punto = cuenta(";");
  const coma = cuenta(",");
  const tab = cuenta("\t");
  if (tab > punto && tab > coma) return "\t";
  return coma > punto ? "," : ";";
}

/** Convierte el texto en filas. Soporta comillas, saltos de línea dentro de un campo y BOM. */
export function parseCsv(input: string, sep?: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const s = sep ?? detectSeparator(text);
  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let entreComillas = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (entreComillas) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          campo += '"';
          i++;
        } else entreComillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') entreComillas = true;
    else if (c === s) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (c !== "\r") campo += c;
  }
  if (campo.length || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((v) => v.trim() !== ""));
}

/** Filas como objetos, usando la primera fila como encabezado normalizado. */
export function parseCsvRows(input: string): { headers: string[]; rows: Record<string, string>[] } {
  const filas = parseCsv(input);
  if (!filas.length) return { headers: [], rows: [] };
  const headers = filas[0].map((h) => normalizeHeader(h));
  const rows = filas.slice(1).map((f) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) o[h] = (f[i] ?? "").trim();
    });
    return o;
  });
  return { headers, rows };
}

/** "Precio anterior" → "precio_anterior" */
export function normalizeHeader(h: string) {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function escapar(v: string | number | null | undefined, sep: string) {
  const s = v === null || v === undefined ? "" : String(v);
  return /["\n\r]|^\s|\s$/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][], sep = ";") {
  const lineas = [headers.map((h) => escapar(h, sep)).join(sep), ...rows.map((r) => r.map((v) => escapar(v, sep)).join(sep))];
  return "﻿" + lineas.join("\r\n") + "\r\n";
}

/** Lee números escritos como "3.500", "3500", "$3.500" o "3,500". */
export function parseNumero(v: string | undefined | null): number | null {
  if (v === undefined || v === null) return null;
  const limpio = String(v).replace(/[^\d,.-]/g, "").trim();
  if (!limpio) return null;
  // Se quitan separadores de miles y se normaliza la coma decimal
  const normalizado = limpio.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function parseBooleano(v: string | undefined | null): boolean | null {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["si", "sí", "s", "true", "1", "x", "verdadero"].includes(s)) return true;
  if (["no", "n", "false", "0", "falso"].includes(s)) return false;
  return null;
}

/** Separa "Japoneses | Nissan" o "Japoneses, Nissan" en una lista. */
export function parseLista(v: string | undefined | null): string[] {
  if (!v) return [];
  return v
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
