import Link from "next/link";
import { Mail } from "lucide-react";
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { SITE, whatsappLink } from "@/lib/site";

export function Footer({ categories }: { categories: { slug: string; name: string }[] }) {
  return (
    <footer className="mt-20 bg-ink text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <img src="/brand/logo.png" alt="Tío Wheels Toys" className="h-20 w-auto" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-300">{SITE.mission.split(".")[0]}.</p>
          <div className="mt-5 flex gap-2">
            <a href={SITE.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-lime hover:text-ink">
              <InstagramIcon className="size-5" />
            </a>
            <a href={SITE.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-lime hover:text-ink">
              <FacebookIcon className="size-5" />
            </a>
            <a href={whatsappLink("Hola Tío Wheels, tengo una consulta")} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-lime hover:text-ink">
              <WhatsAppIcon className="size-5" />
            </a>
          </div>
        </div>

        <div className="md:col-span-2">
          <h4 className="text-sm uppercase tracking-wider text-lime">Tienda</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-300">
            <li><Link href="/tienda" className="hover:text-white">Ver todos los productos</Link></li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link href={`/tienda?cat=${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="text-sm uppercase tracking-wider text-lime">Info</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-300">
            <li><Link href="/nosotros" className="hover:text-white">Nosotros</Link></li>
            <li><Link href="/contacto" className="hover:text-white">Contacto</Link></li>
            <li><Link href="/terminos" className="hover:text-white">Términos y condiciones</Link></li>
            <li><Link href="/privacidad" className="hover:text-white">Política de privacidad</Link></li>
            <li><Link href="/cuenta" className="hover:text-white">Mi cuenta</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h4 className="text-sm uppercase tracking-wider text-lime">Contacto</h4>
          <p className="mt-3 text-sm text-ink-300">Atención por WhatsApp y correo, ventas 24/7.</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-300">
            <li className="flex items-center gap-2"><WhatsAppIcon className="size-4 text-lime" /> <a href={whatsappLink()} className="hover:text-white">{SITE.phone}</a></li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-lime" /> <a href={`mailto:${SITE.email}`} className="hover:text-white">{SITE.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-400 sm:flex-row">
          <span>© {new Date().getFullYear()} {SITE.legalName}. Todos los derechos reservados.</span>
          <span>Pagos seguros con Flow · Webpay, tarjetas y transferencia</span>
        </div>
      </div>
    </footer>
  );
}
