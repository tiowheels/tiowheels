"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { REGIONS } from "@/lib/chile";
import { formatRut } from "@/lib/format";
import { changePassword, updateProfile } from "../actions";
import { Field, FormMessage, SubmitButton, fieldError } from "../_components/FormBits";
import { PasswordInput } from "../_components/PasswordInput";

export type ProfileValues = {
  name: string;
  lastName: string;
  phone: string;
  rut: string;
  address1: string;
  address2: string;
  region: string;
  commune: string;
};

const OTHER = "__otra__";

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [state, action] = useActionState(updateProfile, null);
  const [rut, setRut] = useState(initial.rut ? formatRut(initial.rut) : "");
  const [regionCode, setRegionCode] = useState(REGIONS.some((r) => r.code === initial.region) ? initial.region : "");
  const region = useMemo(() => REGIONS.find((r) => r.code === regionCode), [regionCode]);
  const [commune, setCommune] = useState(initial.commune);
  const inList = Boolean(region && commune && region.comunas.includes(commune));
  const [other, setOther] = useState(Boolean(initial.commune && !inList));

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" id="name" error={fieldError(state, "name")}>
          <input id="name" name="name" autoComplete="given-name" required defaultValue={initial.name} className="input" />
        </Field>
        <Field label="Apellido" id="lastName" optional error={fieldError(state, "lastName")}>
          <input id="lastName" name="lastName" autoComplete="family-name" defaultValue={initial.lastName} className="input" />
        </Field>
        <Field label="Teléfono / WhatsApp" id="phone" optional error={fieldError(state, "phone")}>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" defaultValue={initial.phone} className="input" />
        </Field>
        <Field label="RUT" id="rut" optional error={fieldError(state, "rut")}>
          <input id="rut" name="rut" placeholder="12.345.678-9" value={rut} onChange={(e) => setRut(e.target.value)} onBlur={(e) => setRut(e.target.value.trim() ? formatRut(e.target.value) : "")} className="input" />
        </Field>
      </div>

      <div className="border-t border-ink-100 pt-4">
        <h3 className="text-base">Dirección de entrega por defecto</h3>
        <p className="mt-0.5 text-[13px] text-ink-500">La usaremos para prellenar el checkout.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Región" id="region" optional error={fieldError(state, "region")}>
          <div className="relative">
            <select
              id="region"
              name="region"
              value={regionCode}
              onChange={(e) => {
                setRegionCode(e.target.value);
                setCommune("");
                setOther(false);
              }}
              className="input appearance-none pr-10"
            >
              <option value="">Sin región</option>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          </div>
        </Field>
        <Field label="Comuna" id="commune" optional error={fieldError(state, "commune")}>
          <div className="relative">
            <select
              id="commune"
              disabled={!region}
              value={other ? OTHER : inList ? commune : ""}
              onChange={(e) => {
                if (e.target.value === OTHER) {
                  setOther(true);
                  setCommune("");
                } else {
                  setOther(false);
                  setCommune(e.target.value);
                }
              }}
              className="input appearance-none pr-10"
            >
              <option value="">{region ? "Elige tu comuna" : "Primero elige la región"}</option>
              {region?.comunas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {region ? <option value={OTHER}>Otra comuna (escribir)</option> : null}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          </div>
          {other ? <input aria-label="Escribe tu comuna" placeholder="Escribe tu comuna" value={commune} onChange={(e) => setCommune(e.target.value)} className="input mt-2" /> : null}
          <input type="hidden" name="commune" value={commune} />
        </Field>
        <Field label="Dirección" id="address1" optional className="sm:col-span-2">
          <input id="address1" name="address1" autoComplete="street-address" placeholder="Calle y número" defaultValue={initial.address1} className="input" />
        </Field>
        <Field label="Depto / casa / oficina" id="address2" optional className="sm:col-span-2">
          <input id="address2" name="address2" defaultValue={initial.address2} className="input" />
        </Field>
      </div>
      <SubmitButton variant="primary" className="sm:w-auto sm:px-8">
        Guardar cambios
      </SubmitButton>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(changePassword, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {hasPassword ? (
        <Field label="Contraseña actual" id="current" error={fieldError(state, "current")}>
          <PasswordInput id="current" name="current" autoComplete="current-password" required />
        </Field>
      ) : (
        <p className="rounded-xl bg-lime-50 px-4 py-3 text-[13px] text-ink-700">Tu cuenta aún no tiene contraseña. Crea una ahora para ingresar la próxima vez.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nueva contraseña" id="password" error={fieldError(state, "password")} hint="Mínimo 8 caracteres.">
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Repite la nueva contraseña" id="confirm" error={fieldError(state, "confirm")}>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} />
        </Field>
      </div>
      <SubmitButton variant="outline" className="sm:w-auto sm:px-8">
        {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
      </SubmitButton>
    </form>
  );
}
