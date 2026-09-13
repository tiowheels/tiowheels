"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, UserPlus } from "lucide-react";
import { REGIONS } from "@/lib/chile";
import { updateCustomer, createCustomerFromOrders } from "@/app/admin/(panel)/clientes/actions";
import { esAccionVencida, AVISO_ACCION_VENCIDA, recargarPorActualizacion } from "@/lib/accion-vencida";

export type CustomerFormData = {
  id: string;
  name: string | null;
  lastName: string | null;
  phone: string | null;
  rut: string | null;
  address1: string | null;
  address2: string | null;
  region: string | null;
  city: string | null;
};

export function CustomerForm({ cliente }: { cliente: CustomerFormData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [region, setRegion] = useState(cliente.region ?? "");
  const comunas = REGIONS.find((r) => r.code === region)?.comunas ?? [];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setAviso(null);
    start(async () => {
      try {
        const r = await updateCustomer(fd);
        if (r.ok) {
          setAviso({ tipo: "ok", texto: r.message });
          router.refresh();
        } else setAviso({ tipo: "error", texto: r.error });
      } catch (err) {
        if (esAccionVencida(err)) {
          setAviso({ tipo: "error", texto: AVISO_ACCION_VENCIDA });
          recargarPorActualizacion();
          return;
        }
        setAviso({ tipo: "error", texto: "No se pudo guardar. Revisa la conexión." });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={cliente.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">
            Nombre
          </label>
          <input id="c-name" name="name" defaultValue={cliente.name ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="c-lastName" className="label">
            Apellido
          </label>
          <input id="c-lastName" name="lastName" defaultValue={cliente.lastName ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="c-phone" className="label">
            Teléfono
          </label>
          <input id="c-phone" name="phone" type="tel" inputMode="tel" defaultValue={cliente.phone ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="c-rut" className="label">
            RUT
          </label>
          <input id="c-rut" name="rut" defaultValue={cliente.rut ?? ""} className="input" placeholder="12.345.678-9" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="c-address1" className="label">
            Dirección
          </label>
          <input id="c-address1" name="address1" defaultValue={cliente.address1 ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="c-address2" className="label">
            Depto, casa u oficina
          </label>
          <input id="c-address2" name="address2" defaultValue={cliente.address2 ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="c-region" className="label">
            Región
          </label>
          <select id="c-region" name="region" value={region} onChange={(e) => setRegion(e.target.value)} className="input">
            <option value="">Sin región</option>
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-city" className="label">
            Comuna
          </label>
          <select id="c-city" name="city" defaultValue={cliente.city ?? ""} disabled={!comunas.length} className="input">
            <option value="">{comunas.length ? "Sin comuna" : "Elige la región"}</option>
            {comunas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {aviso && <p className={aviso.tipo === "ok" ? "rounded-xl bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-700" : "rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger"}>{aviso.texto}</p>}

      <button type="submit" disabled={pending} className="btn-primary btn-md w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar datos
      </button>
    </form>
  );
}

/** Botón para crear la ficha de quien compró sin registrarse. */
export function CreateCustomerButton({ email, className }: { email: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const fd = new FormData();
            fd.set("email", email);
            const r = await createCustomerFromOrders(fd);
            if (r.ok) router.push(`/admin/clientes/${r.id}`);
            else setError(r.error);
          })
        }
        className={className ?? "btn-outline btn-sm"}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Crear ficha
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </>
  );
}
