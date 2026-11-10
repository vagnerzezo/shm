"use client";

import { useActionState } from "react";
import { FormError, card, fieldClass, labelClass, primaryButton } from "@/app/_components/ui";
import { sendSystemEmailTest } from "@/app/_lib/settings-actions";
import { cn } from "@/lib/utils";

export function SystemEmailTestForm({ kind, defaultEmail }: { kind: string; defaultEmail: string }) {
  const [state, action, pending] = useActionState(sendSystemEmailTest, { error: null, sentTo: null });

  return (
    <form action={action} className={cn(card, "flex flex-col gap-3 p-4")}>
      <input type="hidden" name="modelo" value={kind} />
      <div>
        <h2 className="font-bold text-black">Enviar teste</h2>
        <p className="text-sm text-black/70">Manda este modelo com o assunto marcado como [Teste].</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className={labelClass}>E-mail de destino</span>
          <input name="email" type="email" required defaultValue={defaultEmail} className={cn(fieldClass, "mt-1.5")} />
        </label>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Enviando..." : "Enviar teste"}
        </button>
      </div>
      <FormError message={state.error} />
      {state.sentTo && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Teste enviado para {state.sentTo}.
        </p>
      )}
    </form>
  );
}
