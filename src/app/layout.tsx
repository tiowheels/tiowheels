import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { Analytics } from "@/components/analytics/Analytics";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} · Autos de colección Hot Wheels en Chile`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32" },
      { url: "/icons/favicon-64.png", sizes: "64x64" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: SITE.name,
    images: [{ url: "/brand/logo.png", width: 1080, height: 432 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={montserrat.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  );
}
