import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Tío Wheels" },
  robots: { index: false, follow: false },
  manifest: "/admin-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "TW Ventas" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
