/**
 * Analítica (Meta Pixel + Google Analytics 4). Todo es opcional: si no hay píxel/GA cargado,
 * las funciones no hacen nada. Usable solo en cliente (revisa `typeof window`).
 *
 * - `track("AddToCart", { value, items })` → fbq `AddToCart` + gtag `add_to_cart`.
 * - `pageView(path)` → fbq `PageView` + gtag `page_view`.
 */

export type AnalyticsItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  brand?: string | null;
  category?: string | null;
};

export type AnalyticsEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

export type AnalyticsParams = {
  value?: number;
  items?: AnalyticsItem[];
  /** Solo para Purchase: id del pedido (deduplicación en GA4 / Meta). */
  orderId?: string;
};

const GA_EVENT: Record<AnalyticsEvent, string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

type Fbq = (...args: unknown[]) => void;
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
export const analyticsEnabled = Boolean(META_PIXEL_ID || GA_ID);

function fbq(): Fbq | null {
  if (!META_PIXEL_ID || typeof window === "undefined") return null;
  return typeof window.fbq === "function" ? window.fbq : null;
}

function gtag(): Gtag | null {
  if (!GA_ID || typeof window === "undefined") return null;
  return typeof window.gtag === "function" ? window.gtag : null;
}

const CURRENCY = "CLP";

/** Envía un evento de ecommerce a los píxeles configurados. Nunca lanza. */
export function track(event: AnalyticsEvent, params: AnalyticsParams = {}) {
  if (!analyticsEnabled) return;
  const items = params.items ?? [];
  const value = params.value ?? items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0);
  try {
    const fb = fbq();
    if (fb) {
      const data: Record<string, unknown> = {
        value,
        currency: CURRENCY,
        content_type: "product",
        content_ids: items.map((i) => i.id),
        contents: items.map((i) => ({ id: i.id, quantity: i.quantity ?? 1, item_price: i.price })),
        num_items: items.reduce((s, i) => s + (i.quantity ?? 1), 0) || undefined,
      };
      if (items.length === 1) data.content_name = items[0].name;
      if (event === "Purchase" && params.orderId) data.order_id = params.orderId;
      // eventID permite deduplicar con la API de conversiones si se agrega más adelante.
      fb("track", event, data, params.orderId ? { eventID: `${event}-${params.orderId}` } : undefined);
    }
  } catch {}
  try {
    const ga = gtag();
    if (ga) {
      const data: Record<string, unknown> = {
        currency: CURRENCY,
        value,
        items: items.map((i) => ({
          item_id: i.id,
          item_name: i.name,
          price: i.price,
          quantity: i.quantity ?? 1,
          item_brand: i.brand ?? undefined,
          item_category: i.category ?? undefined,
        })),
      };
      if (event === "Purchase" && params.orderId) data.transaction_id = params.orderId;
      ga("event", GA_EVENT[event], data);
    }
  } catch {}
}

/** Vista de página (se llama en cada cambio de ruta). */
export function pageView(path: string) {
  if (!analyticsEnabled) return;
  try {
    fbq()?.("track", "PageView");
  } catch {}
  try {
    gtag()?.("event", "page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
  } catch {}
}
