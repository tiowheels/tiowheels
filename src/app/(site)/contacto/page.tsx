import type { Metadata } from "next";
import { Mail, Clock, MessageCircle } from "lucide-react";
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { SITE, whatsappLink } from "@/lib/site";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Contacto",
  description: `Escríbenos por WhatsApp al ${SITE.phone}, por email a ${SITE.email} o por nuestras redes. Ventas 24/7 y atención al cliente.`,
  alternates: { canonical: "/contacto" },
};

const CHANNELS = [
  { icon: WhatsAppIcon, label: "WhatsApp", value: SITE.phone, hint: "La forma más rápida", href: whatsappLink("Hola Tío Wheels, tengo una consulta"), color: "text-[#25D366]" },
  { icon: Mail, label: "Email", value: SITE.email, hint: "Respondemos a la brevedad", href: `mailto:${SITE.email}`, color: "text-lime-700" },
  { icon: InstagramIcon, label: "Instagram", value: "@tiowheels", hint: "Novedades y sorteos", href: SITE.instagram, color: "text-[#ee2a7b]" },
  { icon: FacebookIcon, label: "Facebook", value: "Tío Wheels Toys", hint: "Comunidad y publicaciones", href: SITE.facebook, color: "text-[#1877f2]" },
] as const;

export default function ContactPage() {
  return (
    <div className="pb-16">
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-lime/25 blur-[120px]" />
        <div className="container-x relative py-12 md:py-16">
          <span className="eyebrow !text-lime">Contacto</span>
          <h1 className="mt-3 max-w-2xl text-3xl sm:text-4xl lg:text-5xl">¿Buscas un modelo o tienes una duda? Hablemos.</h1>
          <p className="mt-4 max-w-xl text-ink-300">Te acompañamos antes y después de tu compra. Escríbenos por el canal que prefieras: el Tío siempre responde.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            <Clock className="size-4 text-lime" aria-hidden /> Ventas 24/7 · Atención por WhatsApp
          </div>
        </div>
      </section>

      <div className="container-x mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <section aria-labelledby="form-title">
          <h2 id="form-title" className="text-2xl">
            Envíanos un mensaje
          </h2>
          <p className="mt-1 mb-5 text-ink-500">Te responderemos al email que nos indiques.</p>
          <ContactForm />
        </section>

        <aside className="space-y-3" aria-label="Canales de contacto">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel={c.href.startsWith("http") ? "noreferrer" : undefined} className="card group flex items-center gap-4 p-4 transition hover:shadow-pop">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-ink-50 ${c.color}`}>
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">{c.label}</span>
                  <span className="block truncate font-bold group-hover:underline">{c.value}</span>
                  <span className="block text-xs text-ink-500">{c.hint}</span>
                </span>
              </a>
            );
          })}
          <div className="rounded-card bg-lime-50 p-5">
            <div className="flex items-center gap-2 font-bold">
              <MessageCircle className="size-5 text-lime-700" aria-hidden /> Horario
            </div>
            <p className="mt-2 text-sm text-ink-700">
              <b>Ventas 24/7</b> en la tienda online. Los mensajes se responden en orden de llegada, normalmente el mismo día.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
