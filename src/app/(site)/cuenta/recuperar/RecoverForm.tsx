"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Field, FormMessage, SubmitButton, fieldError } from "../_components/FormBits";

export function RecoverForm({ initialEmail }: { initialEmail?: string }) {
  const [state, action] = useActionState(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <p className="text-sm text-ink-500">
          Enviamos el enlace a <span className="font-semibold text-ink">{state.email}</span>. Es válido por 1 hora.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email" id="email" error={fieldError(state, "email")}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={initialEmail} className="input" />
      </Field>
      <SubmitButton>Enviar enlace</SubmitButton>
    </form>
  );
}
