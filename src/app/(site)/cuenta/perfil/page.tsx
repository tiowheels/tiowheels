import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountShell } from "../_components/AccountShell";
import { PasswordForm, ProfileForm } from "./ProfileForms";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/cuenta/perfil");
  const full = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });

  return (
    <AccountShell current="/cuenta/perfil" user={{ name: user.name, email: user.email }}>
      <div className="space-y-5">
        <section className="card p-5 sm:p-6" aria-labelledby="profile-title">
          <h2 id="profile-title" className="text-xl">
            Mis datos
          </h2>
          <p className="mt-0.5 mb-5 text-[13px] text-ink-500">
            Tu email es <span className="font-semibold text-ink">{user.email}</span>. Si necesitas cambiarlo, escríbenos por WhatsApp.
          </p>
          <ProfileForm
            initial={{
              name: user.name ?? "",
              lastName: user.lastName ?? "",
              phone: user.phone ?? "",
              rut: user.rut ?? "",
              address1: user.address1 ?? "",
              address2: user.address2 ?? "",
              region: user.region ?? "",
              commune: user.commune ?? "",
            }}
          />
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="password-title">
          <h2 id="password-title" className="text-xl">
            Contraseña
          </h2>
          <p className="mt-0.5 mb-5 text-[13px] text-ink-500">Usa una contraseña que no ocupes en otros sitios.</p>
          <PasswordForm hasPassword={Boolean(full?.passwordHash)} />
        </section>
      </div>
    </AccountShell>
  );
}
