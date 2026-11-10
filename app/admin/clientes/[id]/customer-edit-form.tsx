"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, fieldClass as baseField, labelClass, primaryButton } from "@/app/_components/ui";
import { updateCustomer } from "@/app/_lib/customer-actions";
import type { CustomerSummary } from "@/app/_lib/customers";
import { formatPhone } from "@/app/_lib/format";
import { cn } from "@/lib/utils";

const fieldClass = cn(baseField, "mt-1.5");
const box = "mt-0.5 size-4 shrink-0 accent-[#121212]";

export function CustomerEditForm({ customer: c }: { customer: CustomerSummary }) {
  const [state, action, pending] = useActionState(updateCustomer, { error: null, saved: false });
  useEffect(() => {
    if (state.saved) toast("Dados do cliente salvos.");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={c.id} />
      <label>
        <span className={labelClass}>Nome</span>
        <input name="nome" required minLength={2} defaultValue={c.name} className={fieldClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Telefone / WhatsApp</span>
          <input
            name="telefone"
            type="tel"
            required
            inputMode="tel"
            defaultValue={formatPhone(c.phone)}
            className={fieldClass}
          />
        </label>
        <label>
          <span className={labelClass}>E-mail</span>
          <input
            name="email"
            type="email"
            required
            maxLength={120}
            defaultValue={c.email}
            className={fieldClass}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Comunicações autorizadas</legend>
        <label className="mt-1 flex items-start gap-3 text-sm text-black">
          <input type="checkbox" name="aceita_email" defaultChecked={c.consent.email} className={box} />
          Aceita receber e-mails
        </label>
        <label className="flex items-start gap-3 text-sm text-black">
          <input type="checkbox" name="aceita_mensagem" defaultChecked={c.consent.mensagem} className={box} />
          Aceita receber mensagens no chat
        </label>
        <p className="text-xs text-black/60">
          Só marque com autorização do cliente. Ele também pode mudar em “Meus dados”.
        </p>
      </fieldset>

      <label>
        <span className={labelClass}>Observações internas</span>
        <textarea
          name="observacao"
          rows={4}
          maxLength={1000}
          defaultValue={c.adminNote}
          placeholder="Preferências, alergias, estilo de corte... O cliente não vê."
          className={cn(fieldClass, "h-auto py-2.5 leading-relaxed")}
        />
      </label>

      <FormError message={state.error} />

      <div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
