import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { flowConfigured } from "@/lib/flow";
import { mailConfigured } from "@/lib/mail";
import { SITE } from "@/lib/site";
import { getStoreSettings, getNewsletterEmails } from "@/app/admin/_lib/settings";
import { PageHeader } from "@/components/admin/PageHeader";
import { StoreSettingsForm, PasswordForm, NewsletterList } from "@/components/admin/SettingsForms";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const [store, emails] = await Promise.all([getStoreSettings(), getNewsletterEmails()]);
  const flowUrl = process.env.FLOW_API_URL || "https://sandbox.flow.cl/api";
  const integrations = [
    { name: "Flow (pagos online)", ok: flowConfigured(), detail: flowConfigured() ? (flowUrl.includes("sandbox") ? "Modo sandbox (pruebas)" : "Producción") : "Sin claves: la tienda solo ofrece transferencia" },
    { name: "Correo (SMTP)", ok: mailConfigured(), detail: mailConfigured() ? `Envía desde ${process.env.SMTP_FROM || process.env.SMTP_USER}` : "Sin SMTP: los correos se registran en consola" },
    { name: "Almacenamiento de imágenes", ok: true, detail: process.env.STORAGE_DIR ? "Volumen configurado" : "Carpeta local ./storage" },
    { name: "Sitio público", ok: true, detail: SITE.url },
  ];

  return (
    <>
      <PageHeader title="Ajustes" description={`Sesión: ${admin.email}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 md:p-5">
          <h2 className="mb-4 text-base">Tienda</h2>
          <StoreSettingsForm initial={store} />
        </section>

        <div className="space-y-4">
          <section className="card p-4 md:p-5">
            <h2 className="mb-3 text-base">Integraciones</h2>
            <ul className="divide-y divide-ink-100">
              {integrations.map((i) => (
                <li key={i.name} className="flex items-start gap-3 py-2.5">
                  {i.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-ink-300" />}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{i.name}</div>
                    <div className="truncate text-xs text-ink-500">{i.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-400">Las claves se configuran en las variables de entorno del servidor; aquí nunca se muestran.</p>
          </section>

          <section className="card p-4 md:p-5">
            <h2 className="mb-3 text-base">Cambiar contraseña</h2>
            <PasswordForm />
          </section>

          <section className="card p-4 md:p-5">
            <h2 className="mb-3 text-base">Suscriptores del newsletter</h2>
            <NewsletterList emails={emails} />
          </section>
        </div>
      </div>
    </>
  );
}
