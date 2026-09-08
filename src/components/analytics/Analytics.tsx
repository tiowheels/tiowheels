"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { GA_ID, META_PIXEL_ID, analyticsEnabled, pageView, track } from "@/lib/analytics";
import { CART_STORAGE_KEY } from "@/components/cart/CartProvider";

/**
 * Carga Meta Pixel y/o GA4 solo si existen NEXT_PUBLIC_META_PIXEL_ID / NEXT_PUBLIC_GA_ID.
 * Dispara PageView/page_view en cada cambio de ruta e InitiateCheckout al entrar a /checkout.
 */
export function Analytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsEnabled || !pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    pageView(pathname);
    if (pathname === "/checkout") track("InitiateCheckout", readCartForAnalytics());
  }, [pathname]);

  if (!analyticsEnabled) return null;

  return (
    <>
      {META_PIXEL_ID ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');`}
        </Script>
      ) : null}
      {GA_ID ? (
        <>
          <Script id="ga4-src" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/** Lee el carrito guardado (mismo formato que CartProvider) para enriquecer InitiateCheckout. */
function readCartForAnalytics() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const items: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return {};
    const list = items
      .filter((i): i is { productId: string; name: string; price: number; qty: number } => !!i && typeof i === "object" && typeof (i as { productId?: unknown }).productId === "string")
      .map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.qty }));
    return { items: list };
  } catch {
    return {};
  }
}
