"use client";

import { useActionState } from "react";
import { resetPassword } from "../../actions";
import { Field, FormMessage, SubmitButton, fieldError } from "../../_components/FormBits";
import { PasswordInput } from "../../_components/PasswordInput";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, null);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Field label="Nueva contraseña" id="password" error={fieldError(state, "password")} hint="Mínimo 8 caracteres.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} autoFocus />
      </Field>
      <Field label="Repite la contraseña" id="confirm" error={fieldError(state, "confirm")}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton>Guardar e ingresar</SubmitButton>
    </form>
  );
}
