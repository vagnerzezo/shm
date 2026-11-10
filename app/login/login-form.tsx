"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { ConsentFields } from "../_components/consent-fields";
import { LockIcon } from "../_components/icons";
import { signIn, signUp } from "../_lib/actions";

const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-black/20 bg-white px-4 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none";

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-black">{label}</span>
      <input required className={inputClass} {...props} />
    </label>
  );
}

export function LoginForm({ mode, next }: { mode: "entrar" | "cadastro"; next: string }) {
  const signingUp = mode === "cadastro";
  const [state, action, pending] = useActionState(signingUp ? signUp : signIn, { error: null });

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {signingUp && (
        <>
          <Field label="Nome" name="nome" minLength={2} autoComplete="name" />
          <Field
            label="Telefone / WhatsApp"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(51) 99999-9999"
          />
        </>
      )}
      <Field label="E-mail" name="email" type="email" maxLength={120} autoComplete="email" placeholder="voce@exemplo.com" />
      <Field
        label="Senha"
        name="senha"
        type="password"
        minLength={signingUp ? 8 : undefined}
        autoComplete={signingUp ? "new-password" : "current-password"}
        placeholder={signingUp ? "Mínimo de 8 caracteres" : undefined}
      />
      {signingUp && <ConsentFields />}

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#121212] font-semibold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70"
      >
        <LockIcon className="size-4" />
        {pending ? "Aguarde..." : signingUp ? "Criar conta" : "Entrar"}
      </button>
    </form>
  );
}
