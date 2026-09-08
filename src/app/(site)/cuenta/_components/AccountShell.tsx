import Link from "next/link";
import { LogOut, Package, UserRound } from "lucide-react";
import { cn } from "@/lib/format";
import { logout } from "../actions";

const NAV = [
  { href: "/cuenta", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/perfil", label: "Mi perfil", icon: UserRound },
] as const;

/** Marco de la cuenta: saludo, navegación lateral (tabs en móvil) y botón de salir. */
export function AccountShell({ current, user, children }: { current: "/cuenta" | "/cuenta/perfil"; user: { name: string | null; email: string }; children: React.ReactNode }) {
  return (
    <div className="bg-ink-50/60">
      <div className="container-x py-8 md:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">Mi cuenta</span>
            <h1 className="mt-1 text-2xl sm:text-3xl">Hola{user.name ? `, ${user.name}` : ""}</h1>
            <p className="mt-1 text-sm text-ink-500">{user.email}</p>
          </div>
          <form action={logout}>
            <button type="submit" className="btn-outline btn-sm">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
        <div className="grid items-start gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Secciones de la cuenta" className="card flex gap-1 p-1.5 md:flex-col">
            {NAV.map((n) => {
              const active = n.href === current;
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition md:justify-start", active ? "bg-ink text-white" : "text-ink-700 hover:bg-ink-50")}>
                  <n.icon className={cn("size-4", active && "text-lime")} /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
