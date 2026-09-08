/** Utilidades de fecha en zona horaria de Chile para el panel. */
const TZ = "America/Santiago";

/** Devuelve el instante UTC en que empieza el día (00:00 en Santiago) de la fecha dada. */
export function startOfDaySantiago(d = new Date()) {
  const local = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
  const offset = d.getTime() - local.getTime();
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime() + offset);
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86_400_000);
}

/** "YYYY-MM-DD" en Santiago. */
export function ymdSantiago(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Convierte "YYYY-MM-DD" (fecha local de Chile) al inicio del día en UTC. */
export function parseYmdSantiago(s: string | undefined | null) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  // aproximación: creamos la fecha en UTC medianoche y ajustamos al offset de Santiago
  const utcMidnight = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return startOfDaySantiago(utcMidnight);
}

export function startOfMonthSantiago(d = new Date()) {
  const ymd = ymdSantiago(d);
  return parseYmdSantiago(ymd.slice(0, 8) + "01")!;
}

export function weekdayShort(d: Date) {
  return new Intl.DateTimeFormat("es-CL", { timeZone: TZ, weekday: "short" }).format(d).replace(".", "");
}

export function dayMonth(d: Date) {
  return new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d);
}
