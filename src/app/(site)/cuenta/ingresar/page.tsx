import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "../_components/AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };
export const dynamic = "force-dynamic";

function safeNext(raw: string | undefined, fallback = "/cuenta") {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const [{ next, email }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const target = safeNext(next);
  if (user) redirect(user.role === "ADMIN" && target === "/cuenta" ? "/admin" : target);

  return (
    <AuthCard
      title="Ingresar"
      subtitle="Revisa tus pedidos y compra más rápido."
    >
      <LoginForm next={target} initialEmail={email} />
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
        <span className="h-px flex-1 bg-ink-100" /> ¿Primera vez aquí? <span className="h-px flex-1 bg-ink-100" />
      </div>
      <Link href={`/cuenta/registro${next ? `?next=${encodeURIComponent(target)}` : ""}`} className="btn-outline btn-lg w-full">
        Crear cuenta
      </Link>
      <p className="mt-5 rounded-xl bg-ink-50 px-4 py-3 text-[13px] text-ink-500">
        ¿Comprabas en el sitio anterior? Tu cuenta fue migrada:{" "}
        <Link href="/cuenta/recuperar" className="font-semibold text-ink underline underline-offset-2">
          crea una contraseña nueva
        </Link>{" "}
        con tu mismo email.
      </p>
    </AuthCard>
  );
}
