"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, fieldClass, labelClass, primaryButton } from "@/app/_components/ui";
import type { StudioInfo } from "@/app/_lib/db";
import { formatPhone } from "@/app/_lib/format";
import { saveStudio } from "@/app/_lib/settings-actions";
import { cn } from "@/lib/utils";

export function StudioForm({ studio }: { studio: StudioInfo }) {
  const [state, action, pending] = useActionState(saveStudio, { error: null, saved: false });
  useEffect(() => {
    if (state.saved) toast("Dados do estúdio salvos.");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Nome do estúdio</span>
          <input name="nome" required maxLength={60} defaultValue={studio.name} className={cn(fieldClass, "mt-1.5")} />
        </label>
        <label>
          <span className={labelClass}>Telefone / WhatsApp</span>
          <input
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={studio.phone ? formatPhone(studio.phone) : ""}
            placeholder="(51) 99999-9999"
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
      </div>
      <fieldset>
        <legend className={labelClass}>Endereço (até 3 linhas, aparece no menu)</legend>
        <div className="mt-1.5 grid gap-2">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              name="endereco"
              maxLength={80}
              defaultValue={studio.address[i] ?? ""}
              aria-label={`Endereço, linha ${i + 1}`}
              className={fieldClass}
            />
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-black/60">O nome também vai no rodapé dos e-mails e na variável {"{{estudio}}"}.</p>
      <FormError message={state.error} />
      <div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Salvando..." : "Salvar dados do estúdio"}
        </button>
      </div>
    </form>
  );
}
