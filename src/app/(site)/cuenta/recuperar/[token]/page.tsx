import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { AuthCard } from "../../_components/AuthCard";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await db.passwordResetToken.findUnique({ where: { token }, include: { user: { select: { email: true, name: true } } } });
  const valid = Boolean(row && row.expiresAt > new Date());

  if (!valid) {
    return (
      <AuthCard title="Enlace no válido" subtitle="Este enlace ya venció o ya fue usado. Pide uno nuevo y revisa tu correo.">
        <Link href="/cuenta/recuperar" className="btn-primary btn-lg w-full">
          Pedir un enlace nuevo
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crea tu nueva contraseña" subtitle={`Para la cuenta ${row!.user.email}.`}>
      <ResetForm token={token} />
    </AuthCard>
  );
}
