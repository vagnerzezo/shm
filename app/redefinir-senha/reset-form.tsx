"use client";

import { useActionState } from "react";
import { authButton, authInput } from "../_components/auth-shell";
import { LockIcon } from "../_components/icons";
import { resetPassword } from "../_lib/account-actions";

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetPassword, { error: null, saved: false });

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {/* Ajuda o gerenciador de senhas a salvar a senha nova na conta certa. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <label className="block">
        <span className="block text-sm font-semibold text-black">Nova senha</span>
        <input
          name="senha"
          type="password"
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          className={authInput}
        />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold text-black">Confirmar nova senha</span>
        <input
          name="confirmacao"
          type="password"
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          className={authInput}
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={authButton}>
        <LockIcon className="size-4" />
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
