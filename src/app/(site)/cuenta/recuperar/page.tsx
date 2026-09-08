import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../_components/AuthCard";
import { RecoverForm } from "./RecoverForm";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthCard
      title={email ? "Crea tu contraseña nueva" : "Recuperar contraseña"}
      subtitle={email ? "Tu cuenta fue migrada del sitio anterior. Te enviaremos un enlace para crear tu contraseña." : "Te enviaremos un enlace por email para crear una contraseña nueva."}
      footer={
        <Link href="/cuenta/ingresar" className="font-bold text-ink underline underline-offset-2">
          Volver a ingresar
        </Link>
      }
    >
      <RecoverForm initialEmail={email} />
    </AuthCard>
  );
}
