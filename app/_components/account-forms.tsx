"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, card, dangerButton, fieldClass as baseField, labelClass, primaryButton } from "@/app/_components/ui";
import { changePassword, deleteOwnAccount } from "@/app/_lib/account-actions";
import { cn } from "@/lib/utils";

const fieldClass = cn(baseField, "mt-1.5");

/** Troca da própria senha, usada em "Meus dados" (cliente) e no Perfil (admin). */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, { error: null, saved: false });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved) {
      toast("Senha alterada. Os outros aparelhos foram desconectados.");
      form.current?.reset();
    }
  }, [state]);

  return (
    <form ref={form} action={action} className={cn(card, "flex flex-col gap-4 p-5")}>
      <div>
        <h2 className="text-lg font-bold text-black">Senha</h2>
        <p className="text-sm text-black/70">Ao trocar, você continua conectado aqui e sai dos outros aparelhos.</p>
      </div>
      <label>
        <span className={labelClass}>Senha atual</span>
        <input name="atual" type="password" required autoComplete="current-password" className={fieldClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Nova senha</span>
          <input
            name="senha"
            type="password"
            required
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            className={fieldClass}
          />
        </label>
        <label>
          <span className={labelClass}>Confirmar nova senha</span>
          <input name="confirmacao" type="password" required minLength={8} maxLength={100} autoComplete="new-password" className={fieldClass} />
        </label>
      </div>
      <FormError message={state.error} />
      <div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Alterando..." : "Alterar senha"}
        </button>
      </div>
    </form>
  );
}

/** Cliente exclui a própria conta. Pede a senha e a palavra EXCLUIR. */
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteOwnAccount, { error: null, saved: false });

  return (
    <details className={cn(card, "group p-5")}>
      <summary className="cursor-pointer list-none text-lg font-bold text-black marker:hidden [&::-webkit-details-marker]:hidden">
        Excluir minha conta
        <span className="mt-0.5 block text-sm font-normal text-black/70">
          Apaga seus dados, reservas e mensagens. Não tem volta.
        </span>
      </summary>

      <form action={action} className="mt-4 flex flex-col gap-4 border-t border-black/10 pt-4">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Suas reservas futuras serão canceladas e o estúdio não terá mais seu histórico. Para
          voltar, será preciso criar uma conta nova.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Sua senha</span>
            <input name="senha" type="password" required autoComplete="current-password" className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>Digite EXCLUIR para confirmar</span>
            <input
              name="confirmacao"
              required
              autoComplete="off"
              placeholder="EXCLUIR"
              pattern="[Ee][Xx][Cc][Ll][Uu][Ii][Rr]"
              title="Digite EXCLUIR"
              className={fieldClass}
            />
          </label>
        </div>
        <FormError message={state.error} />
        <div>
          <button type="submit" disabled={pending} className={dangerButton}>
            {pending ? "Excluindo..." : "Excluir conta definitivamente"}
          </button>
        </div>
      </form>
    </details>
  );
}
