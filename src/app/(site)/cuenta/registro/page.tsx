import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "../_components/AuthCard";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };
export const dynamic = "force-dynamic";

function safeNext(raw: string | undefined, fallback = "/cuenta") {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const target = safeNext(next);
  if (user) redirect(target);

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Guarda tus datos, revisa tus pedidos y compra más rápido."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href={`/cuenta/ingresar${next ? `?next=${encodeURIComponent(target)}` : ""}`} className="font-bold text-ink underline underline-offset-2">
            Ingresa
          </Link>
        </>
      }
    >
      <RegisterForm next={target} />
    </AuthCard>
  );
}
