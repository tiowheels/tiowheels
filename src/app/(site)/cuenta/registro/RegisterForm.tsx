"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "../actions";
import { Field, FormMessage, SubmitButton, fieldError } from "../_components/FormBits";
import { PasswordInput } from "../_components/PasswordInput";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(register, null);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state?.migrated ? (
        <div role="alert" className="rounded-xl border border-lime bg-lime-50 px-4 py-3 text-sm text-ink-700">
          <p className="font-bold">Este email ya tiene una cuenta migrada</p>
          <p className="mt-1">Comprabas en el sitio anterior. Solo necesitas crear una contraseña nueva.</p>
          <Link href={`/cuenta/recuperar?email=${encodeURIComponent(state.email ?? "")}`} className="btn-primary btn-sm mt-3">
            Crear contraseña nueva
          </Link>
        </div>
      ) : (
        <FormMessage state={state} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" id="name" error={fieldError(state, "name")}>
          <input id="name" name="name" autoComplete="given-name" required className="input" />
        </Field>
        <Field label="Apellido" id="lastName" optional error={fieldError(state, "lastName")}>
          <input id="lastName" name="lastName" autoComplete="family-name" className="input" />
        </Field>
      </div>
      <Field label="Email" id="email" error={fieldError(state, "email")}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required className="input" />
        {state && !state.ok && state.field === "email" && !state.migrated ? (
          <Link href={`/cuenta/ingresar?next=${encodeURIComponent(next)}`} className="mt-1.5 inline-block text-[13px] font-semibold text-ink underline underline-offset-2">
            Ingresar con esta cuenta
          </Link>
        ) : null}
      </Field>
      <Field label="Teléfono / WhatsApp" id="phone" error={fieldError(state, "phone")}>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" required className="input" />
      </Field>
      <Field label="Contraseña" id="password" error={fieldError(state, "password")} hint="Mínimo 8 caracteres.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Repite la contraseña" id="confirm" error={fieldError(state, "confirm")}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} />
      </Field>
      <p className="text-xs text-ink-400">
        Al crear tu cuenta aceptas los{" "}
        <Link href="/terminos" className="font-semibold text-ink underline underline-offset-2">
          términos y condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="font-semibold text-ink underline underline-offset-2">
          política de privacidad
        </Link>
        .
      </p>
      <SubmitButton>Crear cuenta</SubmitButton>
    </form>
  );
}
