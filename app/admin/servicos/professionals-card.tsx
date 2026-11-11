"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { toast } from "@/app/_components/toaster";
import { FormError, card, dangerLink, fieldClass, labelClass, linkButton, primaryButton, secondaryButton } from "@/app/_components/ui";
import { deleteProfessional, saveProfessional, type CatalogFormState } from "@/app/_lib/catalog-actions";
import type { ProfessionalColor } from "@/app/_lib/db";
import { PROFESSIONAL_COLORS } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

type Row = { name: string; color: ProfessionalColor; dot: string; services: number; upcoming: number };

const swatch: Record<ProfessionalColor, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

function ProfessionalForm({ professional, onDone }: { professional?: Row; onDone: () => void }) {
  // Fecha dentro da própria ação: ao renomear, a linha com o nome antigo some da
  // lista e este formulário desmonta antes de um efeito conseguir avisar.
  const [state, action, pending] = useActionState(async (prev: CatalogFormState, formData: FormData) => {
    const result = await saveProfessional(prev, formData);
    if (result.saved) {
      toast(professional ? "Profissional atualizado." : "Profissional adicionado.");
      onDone();
    }
    return result;
  }, { error: null });

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4">
      {professional && <input type="hidden" name="original" value={professional.name} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label>
          <span className={labelClass}>Nome</span>
          <input
            name="nome"
            required
            maxLength={40}
            defaultValue={professional?.name}
            autoFocus
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
        <fieldset>
          <legend className={labelClass}>Cor na agenda</legend>
          <div className="mt-1.5 flex h-11 items-center gap-1.5">
            {PROFESSIONAL_COLORS.map((c) => (
              <label key={c.id} title={c.label} className="cursor-pointer">
                <input
                  type="radio"
                  name="cor"
                  value={c.id}
                  defaultChecked={(professional?.color ?? "emerald") === c.id}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "block size-7 rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-black peer-focus-visible:ring-2 peer-focus-visible:ring-black/50",
                    swatch[c.id],
                  )}
                />
                <span className="sr-only">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {professional && professional.services > 0 && (
        <p className="text-xs text-black/60">Mudar o nome atualiza os serviços e os períodos fechados deste profissional.</p>
      )}
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={cn(primaryButton, "h-10")}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onDone} className={cn(secondaryButton, "h-10")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function ProfessionalsCard({ professionals }: { professionals: Row[] }) {
  // Nome em edição, "novo" para adicionar, ou null.
  const [selected, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);
  // Nome que não existe mais (renomeado ou removido em outra aba) conta como nada em edição.
  const editing = selected === "novo" || professionals.some((p) => p.name === selected) ? selected : null;

  return (
    <section className={cn(card, "mb-1 p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-bold text-black">Profissionais</h2>
          <p className="text-sm text-black/70">Quem atende. A cor identifica as reservas de cada um na agenda.</p>
        </div>
        {editing === null && (
          <button type="button" onClick={() => setEditing("novo")} className={cn(secondaryButton, "h-10")}>
            Adicionar profissional
          </button>
        )}
      </div>

      {editing === "novo" && (
        <div className="mt-4">
          <ProfessionalForm onDone={close} />
        </div>
      )}

      <ul className="mt-4 divide-y divide-black/10">
        {professionals.map((p) =>
          editing === p.name ? (
            <li key={p.name} className="py-3">
              <ProfessionalForm professional={p} onDone={close} />
            </li>
          ) : (
            <li key={p.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className={cn("size-3 shrink-0 rounded-full", p.dot)} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-black">{p.name}</p>
                <p className="text-sm text-black/60">
                  {p.services} {p.services === 1 ? "serviço" : "serviços"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setEditing(p.name)} className={linkButton}>
                  Editar
                </button>
                {p.services === 0 && p.upcoming === 0 ? (
                  <ConfirmButton
                    action={deleteProfessional}
                    fields={{ nome: p.name }}
                    title={`Remover ${p.name}?`}
                    description="Ele não tem serviços. Some da lista de profissionais e do filtro do histórico."
                    confirmLabel="Remover"
                    successMessage="Profissional removido."
                    className={dangerLink}
                  >
                    Remover
                  </ConfirmButton>
                ) : (
                  <span
                    className="text-xs text-black/40"
                    title={p.services > 0 ? "Mova ou exclua os serviços dele antes" : "Remarque ou cancele os horários dele antes"}
                  >
                    {p.services > 0 ? "Tem serviços" : "Tem horários marcados"}
                  </span>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
      {professionals.length === 0 && <p className="mt-2 text-sm text-black/60">Nenhum profissional cadastrado.</p>}
    </section>
  );
}
