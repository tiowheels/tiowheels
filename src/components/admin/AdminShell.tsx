"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Zap, ClipboardList, Package, FolderTree, Users, Settings, ExternalLink, LogOut, MoreHorizontal, X, Inbox } from "lucide-react";
import { cn } from "@/lib/format";
import { InstallPwaButton } from "./InstallPwaButton";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; exact?: boolean };

const MAIN: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/admin/venta-rapida", label: "Venta rápida", icon: Zap },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías y etiquetas", icon: FolderTree },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/mensajes", label: "Mensajes", icon: Inbox },
  { href: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

const MORE_ITEMS = MAIN.filter((i) => ["/admin/categorias", "/admin/clientes", "/admin/mensajes", "/admin/ajustes"].includes(i.href));

function useActive() {
  const pathname = usePathname();
  return (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
}

export function AdminShell({ children, userName, logout, unreadMessages = 0 }: { children: React.ReactNode; userName: string; logout: () => Promise<void>; unreadMessages?: number }) {
  const isActive = useActive();
  const [more, setMore] = useState(false);
  const badgeFor = (href: string) => (href === "/admin/mensajes" && unreadMessages > 0 ? unreadMessages : 0);

  return (
    <div className="min-h-dvh overflow-x-clip bg-ink-50 text-ink md:pl-64 print:bg-white print:pl-0">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink text-white md:flex print:hidden">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <img src="/brand/logo.png" alt="Tío Wheels" className="h-11 w-auto" />
          <span className="rounded-md bg-lime px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {MAIN.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const isQuick = item.href === "/admin/venta-rapida";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                  active ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white",
                  isQuick && !active && "text-lime hover:text-lime",
                  isQuick && active && "bg-lime text-ink hover:bg-lime",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
                {badgeFor(item.href) > 0 && <CountBadge n={badgeFor(item.href)} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <InstallPwaButton variant="dark" />
          <a href="/" target="_blank" rel="noreferrer" className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-300 transition hover:bg-white/5 hover:text-white">
            <ExternalLink className="size-5 shrink-0" />
            Ver tienda
          </a>
          <form action={logout}>
            <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-300 transition hover:bg-white/5 hover:text-white">
              <LogOut className="size-5 shrink-0" />
              Salir
            </button>
          </form>
          <div className="truncate px-3 pt-1 text-[11px] text-ink-400">{userName}</div>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-100 bg-white/95 px-4 backdrop-blur md:hidden print:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/brand/logo.png" alt="Tío Wheels" className="h-7 w-auto" />
          <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lime">Admin</span>
        </Link>
        <a href="/" target="_blank" rel="noreferrer" className="btn-ghost btn-sm -mr-2 text-ink-500">
          Ver tienda <ExternalLink className="size-4" />
        </a>
      </header>

      <main className="min-h-dvh min-w-0 max-w-full overflow-x-clip px-4 pb-28 pt-4 sm:px-6 md:px-8 md:pb-10 md:pt-8 print:p-0">{children}</main>

      {/* Barra inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur safe-bottom md:hidden print:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          <MobileTab item={MAIN[0]} active={isActive(MAIN[0])} />
          <MobileTab item={MAIN[2]} active={isActive(MAIN[2])} />
          <Link href="/admin/venta-rapida" className="flex flex-col items-center justify-center gap-0.5" aria-label="Venta rápida">
            <span className={cn("flex size-14 -translate-y-4 items-center justify-center rounded-full border-4 border-white bg-lime text-ink shadow-pop transition active:scale-95", isActive(MAIN[1]) && "ring-2 ring-ink")}>
              <Zap className="size-7" strokeWidth={2.5} />
            </span>
            <span className="-mt-3 text-[10px] font-bold text-ink">Venta</span>
          </Link>
          <MobileTab item={MAIN[3]} active={isActive(MAIN[3])} />
          <button type="button" onClick={() => setMore(true)} className={cn("relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold", MORE_ITEMS.some(isActive) ? "text-ink" : "text-ink-400")}>
            <MoreHorizontal className="size-6" />
            Más
            {unreadMessages > 0 && <CountBadge n={unreadMessages} className="absolute right-3 top-2" />}
          </button>
        </div>
      </nav>

      {/* Hoja "Más" */}
      {more && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/50 md:hidden" onClick={() => setMore(false)}>
          <div className="w-full rounded-t-card bg-white p-4 safe-bottom shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1 pb-3">
              <span className="text-sm font-bold">Más opciones</span>
              <button type="button" aria-label="Cerrar" onClick={() => setMore(false)} className="btn-ghost size-10 !p-0">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMore(false)} className={cn("relative flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold", isActive(item) ? "border-ink bg-ink text-white" : "border-ink-200 bg-white text-ink-700")}>
                    <Icon className="size-6" />
                    {item.label}
                    {badgeFor(item.href) > 0 && <CountBadge n={badgeFor(item.href)} className="absolute right-2 top-2" />}
                  </Link>
                );
              })}
              <a href="/" target="_blank" rel="noreferrer" className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700">
                <ExternalLink className="size-6" />
                Ver tienda
              </a>
              <form action={logout} className="contents">
                <button type="submit" className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-ink-200 text-xs font-semibold text-danger">
                  <LogOut className="size-6" />
                  Salir
                </button>
              </form>
            </div>
            <div className="mt-3">
              <InstallPwaButton variant="light" />
            </div>
            <p className="mt-3 truncate px-1 text-center text-[11px] text-ink-400">Sesión: {userName}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold", active ? "text-ink" : "text-ink-400")}>
      <Icon className={cn("size-6", active && "text-ink")} strokeWidth={active ? 2.5 : 2} />
      {item.label}
    </Link>
  );
}

function CountBadge({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-black tabular-nums text-ink", className)} aria-label={`${n} sin leer`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
