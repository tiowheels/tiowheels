/** Couriers y enlaces de seguimiento (usable en cliente y servidor). */

export const CARRIERS = [
  { value: "Starken", label: "Starken", track: (code: string) => `https://www.starken.cl/seguimiento?codigo=${encodeURIComponent(code)}` },
  { value: "Chilexpress", label: "Chilexpress", track: (code: string) => `https://centrodeayuda.chilexpress.cl/seguimiento?n_seguimiento=${encodeURIComponent(code)}` },
  { value: "Blue Express", label: "Blue Express", track: (code: string) => `https://www.blue.cl/enviar/seguimiento?n_seguimiento=${encodeURIComponent(code)}` },
  { value: "Correos de Chile", label: "Correos de Chile", track: () => "https://www.correos.cl/seguimiento" },
  { value: "Otro", label: "Otro", track: () => null },
] as const;

export type CarrierValue = (typeof CARRIERS)[number]["value"];

export const CARRIER_VALUES = CARRIERS.map((c) => c.value) as [CarrierValue, ...CarrierValue[]];

/** URL pública de seguimiento para el courier y código dados (null si no hay enlace conocido). */
export function trackingUrl(carrier: string | null | undefined, code: string | null | undefined): string | null {
  if (!carrier || !code) return null;
  const c = CARRIERS.find((x) => x.value.toLowerCase() === carrier.trim().toLowerCase());
  return c ? c.track(code.trim()) : null;
}
