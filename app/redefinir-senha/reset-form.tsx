"use client";

import { useActionState } from "react";
import { LockIcon } from "../_components/icons";
import { PasswordInput } from "../_components/password-input";
import { resetPassword } from "../_lib/account-actions";
import { authFormStyles, type Variant } from "../login/auth-form-styles";

/** No celular (`mobile`), mesmos campos e botão do login do celular. */
export function ResetForm({ token, email, variant = "desktop" }: { token: string; email: string; variant?: Variant }) {
  const [state, action, pending] = useActionState(resetPassword, { error: null, saved: false });
  const mobile = variant === "mobile";
  const s = authFormStyles[variant];

  return (
    <form action={action} className={mobile ? "flex flex-col gap-3.5" : "mt-6 flex flex-col gap-4"}>
      <input type="hidden" name="token" value={token} />
      {/* Ajuda o gerenciador de senhas a salvar a senha nova na conta certa. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <label className="block">
        <span className={s.label}>Nova senha</span>
        <PasswordInput
          wrapperClassName={s.gap}
          name="senha"
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          className={s.input}
        />
      </label>
      <label className="block">
        <span className={s.label}>Confirmar nova senha</span>
        <PasswordInput
          wrapperClassName={s.gap}
          name="confirmacao"
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          className={s.input}
        />
      </label>
      {state.error && (
        <p role="alert" className={`${mobile ? "rounded-[14px]" : "rounded-lg"} bg-red-50 px-4 py-3 text-sm font-medium text-red-800`}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={s.button}>
        {!mobile && <LockIcon className="size-4" />}
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
