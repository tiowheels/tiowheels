import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GarageIcon, WheelIcon } from "@/components/ui/AutoIcons";
import { SearchBox } from "@/components/site/SearchBox";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-16 text-center md:py-24">
      <div className="relative">
        <span className="select-none text-[120px] font-black leading-none tracking-tighter text-ink-100 sm:text-[180px]" aria-hidden>
          404
        </span>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-ink shadow-pop">Fuera de pista</span>
      </div>
      <h1 className="mt-4 text-3xl sm:text-4xl">Esta página no existe</h1>
      <p className="mt-3 max-w-md text-ink-500">Puede que el producto se haya vendido, que el enlace esté mal escrito o que la página haya cambiado de lugar. Busca el modelo que quieres o vuelve a la tienda.</p>
      <div className="mt-8 w-full max-w-lg">
        <SearchBox variant="hero" />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/tienda" className="btn-primary btn-md">
          <WheelIcon className="size-4" /> Ver la tienda
        </Link>
        <Link href="/" className="btn-outline btn-md">
          <GarageIcon className="size-4" /> Ir al inicio
        </Link>
        <a href={whatsappLink("Hola Tío Wheels, busco un modelo y no lo encuentro en la web")} target="_blank" rel="noreferrer" className="btn-ghost btn-md">
          <WhatsAppIcon className="size-4 text-[#25D366]" /> Preguntar por WhatsApp <ArrowRight className="size-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
