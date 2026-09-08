import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { whatsappLink } from "@/lib/site";

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink("Hola Tío Wheels, tengo una consulta sobre un producto")}
      target="_blank"
      rel="noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop transition hover:scale-105 max-sm:bottom-4 max-sm:right-4"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
