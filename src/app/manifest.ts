import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tío Wheels · Autos de colección",
    short_name: "Tío Wheels",
    description: "Tienda de autos a escala Hot Wheels en Chile. Catálogo, compras y panel de ventas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    lang: "es-CL",
    categories: ["shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tienda", url: "/tienda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Venta rápida", url: "/admin/venta-rapida", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pedidos", url: "/admin/pedidos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
