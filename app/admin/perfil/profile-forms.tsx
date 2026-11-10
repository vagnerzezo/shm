"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, card, fieldClass as baseField, labelClass, primaryButton } from "@/app/_components/ui";
import { changeAdminPassword, updateAdminProfile } from "@/app/_lib/admin-profile-actions";
import { cn } from "@/lib/utils";

const fieldClass = cn(baseField, "mt-1.5");

export function AdminProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState(updateAdminProfile, { error: null, saved: false });
  useEffect(() => {
    if (state.saved) toast("Dados salvos.");
  }, [state]);

  return (
    <form action={action} className={cn(card, "flex flex-col gap-4 p-5")}>
      <h2 className="text-lg font-bold text-black">Seus dados</h2>
      <label>
        <span className={labelClass}>Nome</span>
        <input name="nome" required minLength={2} autoComplete="name" defaultValue={name} className={fieldClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Telefone / WhatsApp</span>
          <input name="telefone" type="tel" required inputMode="tel" autoComplete="tel" defaultValue={phone} className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>E-mail (login)</span>
          <input name="email" type="email" required maxLength={120} autoComplete="email" defaultValue={email} className={fieldClass} />
        </label>
      </div>
      <FormError message={state.error} />
      <div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Salvando..." : "Salvar dados"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeAdminPassword, { error: null, saved: false });
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
