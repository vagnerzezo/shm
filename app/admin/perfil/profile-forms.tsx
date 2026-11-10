"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, card, fieldClass as baseField, labelClass, primaryButton } from "@/app/_components/ui";
import { updateAdminProfile } from "@/app/_lib/admin-profile-actions";
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
