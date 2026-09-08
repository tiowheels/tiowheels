import { ChevronDown } from "lucide-react";
import { HelmetIcon } from "@/components/ui/AutoIcons";
import { safeJsonLd } from "@/lib/seo";

export const FAQ_ITEMS = [
  {
    q: "¿Cómo se envía mi pedido?",
    a: "Despachamos a todo Chile con envío por pagar vía Starken u otros couriers. Preparamos y despachamos tu pedido en 1 a 3 días hábiles desde que se confirma el pago.",
  },
  {
    q: "¿Puedo retirar mi compra?",
    a: "Sí, el retiro es gratis. Al finalizar la compra elige retiro y coordinamos día y hora por WhatsApp.",
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Pago en línea con Flow (Webpay, tarjetas de crédito y débito) y transferencia bancaria.",
  },
  {
    q: "¿Los autos vienen en su blíster original?",
    a: "Sí. Todos los autos se venden nuevos y sellados en su blíster original, salvo que la ficha del producto indique lo contrario.",
  },
] as const;

/** Bloque compacto de preguntas frecuentes con <details> accesibles y JSON-LD FAQPage. */
export function Faq({ className }: { className?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <section className={className} aria-labelledby="faq-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
        <div>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-ink text-lime">
            <HelmetIcon className="size-6" />
          </span>
          <span className="eyebrow mt-4 block">Compra con confianza</span>
          <h2 id="faq-title" className="mt-1 text-2xl sm:text-3xl">
            Preguntas frecuentes
          </h2>
          <p className="mt-3 text-ink-500">Lo que más nos preguntan antes de comprar. ¿Tienes otra duda? Escríbenos por WhatsApp.</p>
        </div>
        <div className="divide-y divide-ink-100 rounded-card bg-ink-50 px-5 sm:px-6">
          {FAQ_ITEMS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2 pr-8 text-sm leading-relaxed text-ink-700">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
