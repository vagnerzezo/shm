"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckIcon } from "../_components/icons";
import { requestPasswordReset } from "../_lib/account-actions";
import { authFormStyles, type Variant } from "../login/login-form";

/** No celular (`mobile`), mesmos campos e botão do login do celular. */
export function ForgotForm({ variant = "desktop" }: { variant?: Variant }) {
  const [state, action, pending] = useActionState(requestPasswordReset, { error: null, saved: false });
  const mobile = variant === "mobile";
  const s = authFormStyles[variant];

  if (state.saved) {
    return (
      <div
        role="status"
        className={`${mobile ? "rounded-[14px] bg-[#f5f5f5]" : "mt-6 rounded-xl bg-white/85"} border border-black/10 p-5 text-sm text-black`}
      >
        <p className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded-full bg-[#121212] text-white">
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </span>
          Confira seu e-mail
        </p>
        <p className="mt-2 text-black/70">
          Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha.
          Ele vale por 1 hora. Não chegou? Veja a caixa de spam ou fale com o estúdio.
        </p>
        <Link href={mobile ? "/login?modo=entrar" : "/login"} className="mt-4 inline-block font-semibold underline underline-offset-4 hover:text-black/70">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className={mobile ? "flex flex-col gap-3.5" : "mt-6 flex flex-col gap-4"}>
      <label className="block">
        <span className={s.label}>E-mail</span>
        <input
          name="email"
          type="email"
          required
          maxLength={120}
          autoComplete="email"
          placeholder={mobile ? "voce@email.com" : "voce@exemplo.com"}
          className={`${s.gap} ${s.input}`}
        />
      </label>
      {state.error && (
        <p role="alert" className={`${mobile ? "rounded-[14px]" : "rounded-lg"} bg-red-50 px-4 py-3 text-sm font-medium text-red-800`}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={s.button}>
        {pending ? "Enviando..." : "Enviar link"}
      </button>
    </form>
  );
}
