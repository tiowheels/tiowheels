"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ShoppingBag, User, Search } from "lucide-react";
import { InstagramIcon } from "@/components/ui/BrandIcons";
import { NAV, SITE } from "@/lib/site";
import { cn } from "@/lib/format";
import { SearchBox } from "./SearchBox";
import { AnnouncementBar } from "./AnnouncementBar";
import { useCart } from "@/components/cart/CartProvider";

export type HeaderCategory = { slug: string; name: string; count: number; children: { slug: string; name: string; count: number }[] };

export function Header({ categories, user }: { categories: HeaderCategory[]; user: { name: string | null; role: string } | null }) {
  const pathname = usePathname();
  const cart = useCart();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización con estado externo (hidratación/DOM)
    setMenu(false);
    setSearch(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  const top = categories.slice(0, 8);

  return (
    <>
      <div className="bg-ink text-white">
        <div className="container-x flex h-9 items-center justify-between text-[12px] font-medium">
          <div className="min-w-0 flex-1">
            <AnnouncementBar />
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <a href={SITE.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-lime">
              <InstagramIcon className="size-3.5" /> @tiowheels
            </a>
            <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-lime">
              WhatsApp {SITE.phone}
            </a>
          </div>
        </div>
      </div>

      <header className={cn("sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md transition-shadow", scrolled ? "border-ink-100 shadow-card" : "border-transparent")}>
        <div className="container-x relative flex h-16 items-center gap-3 md:h-[76px]">
          <button onClick={() => setMenu(true)} aria-label="Abrir menú" className="flex size-10 items-center justify-center rounded-full hover:bg-ink-50 lg:hidden">
            <Menu className="size-6" />
          </button>

          <Link href="/" className="absolute left-1/2 flex shrink-0 -translate-x-1/2 items-center md:static md:translate-x-0" aria-label="Tío Wheels, inicio">
            <img src="/brand/logo.png" alt="Tío Wheels Toys" className="h-10 w-auto md:h-12" />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold transition hover:bg-ink-50", pathname === n.href && "bg-ink-50")}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="mx-auto hidden w-full max-w-xl md:block">
            <SearchBox />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setSearch((s) => !s)} aria-label="Buscar" className="flex size-10 items-center justify-center rounded-full hover:bg-ink-50 md:hidden">
              <Search className="size-[22px]" />
            </button>
            <Link href={user ? (user.role === "ADMIN" ? "/admin" : "/cuenta") : "/cuenta/ingresar"} aria-label={user ? "Mi cuenta" : "Ingresar"} title={user ? "Mi cuenta" : "Ingresar"} className="hidden size-10 items-center justify-center rounded-full hover:bg-ink-50 sm:flex">
              <User className="size-[22px]" />
            </Link>
            <button onClick={cart.open} aria-label="Carrito" className="relative flex h-10 items-center gap-2 rounded-full bg-ink px-3.5 text-white transition hover:bg-ink-700">
              <ShoppingBag className="size-5" />
              <span className="hidden text-sm font-semibold sm:inline">Carrito</span>
              {cart.hydrated && cart.count > 0 ? (
                <span key={cart.count} className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1 text-[11px] font-bold text-ink motion-safe:animate-pop">
                  {cart.count}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {search ? (
          <div className="container-x pb-3 md:hidden">
            <SearchBox autoFocus onNavigate={() => setSearch(false)} />
          </div>
        ) : null}

        <div className="hidden border-t border-ink-100 lg:block">
          <div className="container-x flex h-11 items-center gap-1 overflow-x-auto scrollbar-none">
            {top.map((c) => (
              <Link key={c.slug} href={`/tienda?cat=${c.slug}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50 hover:text-ink">
                {c.name}
              </Link>
            ))}
            <Link href="/tienda" className="ml-auto whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold text-lime-700 hover:bg-lime-50">
              Ver todo el catálogo →
            </Link>
          </div>
        </div>
      </header>

      {/* Menú móvil */}
      <div className={cn("fixed inset-0 z-[80] lg:hidden", menu ? "" : "pointer-events-none")} aria-hidden={!menu}>
        <div onClick={() => setMenu(false)} className={cn("absolute inset-0 bg-ink/50 transition-opacity", menu ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-pop transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]", menu ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <img src="/brand/logo.png" alt="Tío Wheels" className="h-9" />
            <button onClick={() => setMenu(false)} aria-label="Cerrar" className="flex size-10 items-center justify-center rounded-full hover:bg-ink-50">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <nav className="flex flex-col">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-xl px-3 py-3 text-base font-bold hover:bg-ink-50">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 eyebrow px-3">Categorías</div>
            <nav className="mt-2 flex flex-col">
              {categories.map((c) => (
                <Link key={c.slug} href={`/tienda?cat=${c.slug}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-semibold hover:bg-ink-50">
                  {c.name}
                  <span className="text-xs font-medium text-ink-400">{c.count}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="safe-bottom border-t border-ink-100 px-5 py-4">
            <Link href={user ? (user.role === "ADMIN" ? "/admin" : "/cuenta") : "/cuenta/ingresar"} className="btn-outline btn-md w-full">
              <User className="size-4" /> {user ? (user.name ? `Hola, ${user.name.split(" ")[0]}` : "Mi cuenta") : "Ingresar"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
