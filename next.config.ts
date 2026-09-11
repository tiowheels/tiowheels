import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "pg", "@prisma/adapter-pg", "@prisma/client"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    // Con proxy, Next guarda el cuerpo en memoria y por defecto corta en 10 MB:
    // las fotos de celular pasaban ese límite y el formulario llegaba incompleto.
    proxyClientMaxBodySize: "25mb",
  },
  async redirects() {
    // URLs del sitio WooCommerce anterior → nuevas rutas (SEO)
    return [
      { source: "/shop", destination: "/tienda", permanent: true },
      { source: "/shop/:path*", destination: "/tienda", permanent: true },
      { source: "/producto/:slug/", destination: "/producto/:slug", permanent: true },
      { source: "/categoria-producto/:slug", destination: "/tienda?cat=:slug", permanent: true },
      { source: "/categoria-producto/:slug/:rest*", destination: "/tienda?cat=:slug", permanent: true },
      { source: "/etiqueta-producto/:slug", destination: "/tienda", permanent: true },
      { source: "/cart", destination: "/carrito", permanent: true },
      { source: "/my-account", destination: "/cuenta", permanent: true },
      { source: "/my-account/:path*", destination: "/cuenta", permanent: true },
      { source: "/refund_returns", destination: "/terminos", permanent: true },
      { source: "/politicas-de-privacidad", destination: "/privacidad", permanent: true },
      { source: "/inicio", destination: "/", permanent: true },
      { source: "/wp-login.php", destination: "/cuenta/ingresar", permanent: true },
      { source: "/wp-admin", destination: "/admin", permanent: false },
      { source: "/wp-admin/:path*", destination: "/admin", permanent: false },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      // Next.js requiere scripts inline para la hidratación; en desarrollo también eval (HMR/source maps)
      // Analítica opcional (Meta Pixel / GA4): solo se cargan si hay NEXT_PUBLIC_META_PIXEL_ID / NEXT_PUBLIC_GA_ID
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com`,
      "style-src 'self' 'unsafe-inline'",
      // `https:` ya cubre los píxeles de imagen (www.facebook.com/tr, *.google-analytics.com/collect)
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' https://*.flow.cl https://www.flow.cl https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
      "frame-src https://*.flow.cl https://www.flow.cl",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");
    const security = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]),
    ];
    return [
      { source: "/(.*)", headers: security },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/cuenta/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/pedido/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
