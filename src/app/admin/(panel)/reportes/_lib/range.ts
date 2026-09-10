/**
 * Rango de fechas de los reportes del panel.
 *
 * Se controla por query string: `rango` (atajo) o `desde`/`hasta` (YYYY-MM-DD, fechas de Chile).
 * Todo se resuelve a instantes UTC (`from` inclusivo, `to` exclusivo) porque las columnas
 * `createdAt` guardan UTC; para agrupar por día usamos la conversión a hora de Santiago en SQL.
 */
import { startOfDaySantiago, addDays, startOfMonthSantiago, ymdSantiago, parseYmdSantiago } from "@/app/admin/_lib/dates";

export const RANGE_PRESETS = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "mes", label: "Este mes" },
  { key: "mes-pasado", label: "Mes pasado" },
  { key: "anio", label: "Este año" },
  { key: "todo", label: "Todo" },
] as const;

export type RangeKey = (typeof RANGE_PRESETS)[number]["key"];
export type Bucket = "day" | "week" | "month";

export type ReportRange = {
  /** Inicio inclusivo (instante UTC). */
  from: Date;
  /** Fin exclusivo (instante UTC). */
  to: Date;
  /** Periodo anterior equivalente (null cuando el rango es "todo"). */
  prevFrom: Date | null;
  prevTo: Date | null;
  /** Atajo elegido o "custom" si vienen fechas sueltas. */
  key: RangeKey | "custom";
  /** true cuando el rango no tiene inicio real ("todo" o solo `hasta`): la serie parte en el primer dato. */
  openStart: boolean;
  /** "YYYY-MM-DD" en Chile, `hasta` es inclusivo. */
  desde: string;
  hasta: string;
  /** Días que cubre el rango. */
  days: number;
  bucket: Bucket;
  label: string;
  /** Parámetros para reconstruir el rango en enlaces (chart, CSV, etc.). */
  params: Record<string, string>;
};

const MIN_DATE = new Date(Date.UTC(2000, 0, 1));

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Suma días quedándose siempre a las 00:00 de Chile (a prueba de cambios de horario). */
function shiftDays(d: Date, days: number) {
  return startOfDaySantiago(new Date(addDays(d, days).getTime() + 12 * 3_600_000));
}

export function resolveRange(sp: Record<string, string | string[] | undefined>, now = new Date()): ReportRange {
  const today = startOfDaySantiago(now);
  const tomorrow = shiftDays(today, 1);
  const desdeParam = parseYmdSantiago(str(sp.desde));
  const hastaParam = parseYmdSantiago(str(sp.hasta));
  const rango = str(sp.rango);

  let key: RangeKey | "custom";
  let from: Date;
  let to: Date;

  if (desdeParam || hastaParam) {
    key = "custom";
    from = desdeParam ?? MIN_DATE;
    to = hastaParam ? shiftDays(hastaParam, 1) : tomorrow;
    if (to <= from) to = shiftDays(from, 1);
  } else {
    key = (RANGE_PRESETS.find((p) => p.key === rango)?.key ?? "30d") as RangeKey;
    switch (key) {
      case "hoy":
        from = today;
        to = tomorrow;
        break;
      case "7d":
        from = shiftDays(today, -6);
        to = tomorrow;
        break;
      case "mes":
        from = startOfMonthSantiago(now);
        to = tomorrow;
        break;
      case "mes-pasado":
        to = startOfMonthSantiago(now);
        from = startOfMonthSantiago(shiftDays(to, -1));
        break;
      case "anio":
        from = parseYmdSantiago(`${ymdSantiago(now).slice(0, 4)}-01-01`)!;
        to = tomorrow;
        break;
      case "todo":
        from = MIN_DATE;
        to = tomorrow;
        break;
      default:
        from = shiftDays(today, -29);
        to = tomorrow;
    }
  }

  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const bucket: Bucket = days <= 62 ? "day" : days <= 400 ? "week" : "month";
  const span = to.getTime() - from.getTime();
  const comparable = key !== "todo" && from > MIN_DATE;

  const desde = ymdSantiago(from);
  const hasta = ymdSantiago(shiftDays(to, -1));
  const openStart = from <= MIN_DATE;

  return {
    from,
    to,
    prevFrom: comparable ? new Date(from.getTime() - span) : null,
    prevTo: comparable ? from : null,
    key,
    openStart,
    desde,
    hasta,
    days,
    bucket,
    label: key === "todo" ? "Todo el historial" : key === "hoy" ? "Hoy" : openStart ? `Hasta ${formatYmd(hasta)}` : `${formatYmd(desde)} – ${formatYmd(hasta)}`,
    params: key === "custom" ? { desde, hasta } : { rango: key },
  };
}

/** Enlace conservando el rango actual. */
export function withRange(basePath: string, range: ReportRange, extra: Record<string, string | undefined> = {}) {
  const sp = new URLSearchParams(range.params);
  for (const [k, v] of Object.entries(extra)) {
    if (v) sp.set(k, v);
    else sp.delete(k);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/* ---------------------------------------------------------------- buckets */

function ymdToUtc(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function utcToYmd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Normaliza una fecha "YYYY-MM-DD" al inicio de su bucket (día, lunes de la semana o 1° de mes). */
export function bucketStart(ymd: string, bucket: Bucket) {
  const d = ymdToUtc(ymd);
  if (bucket === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (bucket === "month") d.setUTCDate(1);
  return utcToYmd(d);
}

/** Lista de buckets consecutivos entre dos fechas "YYYY-MM-DD" (ambas inclusivas). */
export function bucketKeys(fromYmd: string, toYmd: string, bucket: Bucket, max = 400) {
  const keys: string[] = [];
  const end = ymdToUtc(bucketStart(toYmd, bucket));
  const cur = ymdToUtc(bucketStart(fromYmd, bucket));
  while (cur <= end && keys.length < max) {
    keys.push(utcToYmd(cur));
    if (bucket === "day") cur.setUTCDate(cur.getUTCDate() + 1);
    else if (bucket === "week") cur.setUTCDate(cur.getUTCDate() + 7);
    else cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return keys;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", ...opts });

function formatYmd(ymd: string) {
  return fmt({ day: "2-digit", month: "short", year: "numeric" }).format(ymdToUtc(ymd));
}

/** Etiqueta completa del bucket, para tablas y tooltips. */
export function bucketLabel(key: string, bucket: Bucket) {
  const d = ymdToUtc(key);
  if (bucket === "month") return fmt({ month: "long", year: "numeric" }).format(d);
  if (bucket === "week") return `Semana del ${fmt({ day: "2-digit", month: "short" }).format(d)}`;
  return fmt({ weekday: "short", day: "2-digit", month: "short" }).format(d).replace(".", "");
}

/** Etiqueta corta para el eje del gráfico. */
export function bucketTick(key: string, bucket: Bucket) {
  const d = ymdToUtc(key);
  if (bucket === "month") return fmt({ month: "short" }).format(d).replace(".", "");
  return fmt({ day: "2-digit", month: "2-digit" }).format(d);
}
