"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { Field, FormMessage, SubmitButton, fieldError } from "../_components/FormBits";
import { PasswordInput } from "../_components/PasswordInput";

export function LoginForm({ next, initialEmail }: { next: string; initialEmail?: string }) {
  const [state, action] = useActionState(login, null);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state?.migrated ? (
        <div role="alert" className="rounded-xl border border-lime bg-lime-50 px-4 py-3 text-sm text-ink-700">
          <p className="font-bold">Tu cuenta fue migrada al nuevo sitio</p>
          <p className="mt-1">Encontramos tu email, pero necesitas crear una contraseña nueva para ingresar.</p>
          <Link href={`/cuenta/recuperar?email=${encodeURIComponent(state.email ?? "")}`} className="btn-primary btn-sm mt-3">
            Crear contraseña nueva
          </Link>
        </div>
      ) : (
        <FormMessage state={state} />
      )}
      <Field label="Email" id="email" error={fieldError(state, "email")}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.email ?? initialEmail} className="input" />
      </Field>
      <Field label="Contraseña" id="password" error={fieldError(state, "password")}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
        <div className="mt-1.5 text-right">
          <Link href="/cuenta/recuperar" className="text-[13px] font-semibold text-ink-500 hover:text-ink">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </Field>
      <SubmitButton>Ingresar</SubmitButton>
    </form>
  );
}
