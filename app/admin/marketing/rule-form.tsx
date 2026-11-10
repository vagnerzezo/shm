"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Channel, SendRule } from "@/app/_lib/db";
import { saveRule } from "@/app/_lib/marketing-actions";
import { cn } from "@/lib/utils";
import { card, fieldClass, labelClass, primaryButton, secondaryButton } from "./ui";

export function RuleForm({
  channel,
  rule,
  templates,
  defaultName,
  cancelHref,
}: {
  channel: Channel;
  rule?: SendRule;
  templates: { id: string; name: string }[];
  defaultName: string | null;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveRule, { error: null });

  return (
    <form action={action} className={cn(card, "flex flex-col gap-4 p-5")}>
      <input type="hidden" name="canal" value={channel} />
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <h3 className="text-lg font-bold text-black">{rule ? "Editar regra" : "Nova regra"}</h3>

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <label>
          <span className={labelClass}>Nome da regra</span>
          <input
            name="nome"
            required
            maxLength={60}
            defaultValue={rule?.name}
            placeholder="Ex.: Lembrete de 20 dias"
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
        <label>
          <span className={labelClass}>Dias sem agendar</span>
          <input
            name="dias"
            type="number"
            required
            min={1}
            max={365}
            defaultValue={rule?.daysAfter ?? 20}
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
      </div>

      <label>
        <span className={labelClass}>Template</span>
        <select name="template" defaultValue={rule?.templateId ?? ""} className={cn(fieldClass, "mt-1.5")}>
          <option value="">Usar o padrão do canal{defaultName ? ` (${defaultName})` : " (nenhum definido)"}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-black">
        <input type="checkbox" name="ativo" defaultChecked={rule?.active ?? true} className="size-4 accent-[#121212]" />
        Regra ativa
      </label>

      <p className="text-xs text-black/60">
        Conta a partir da última visita do cliente. Se ele marcar um novo horário antes do prazo, o envio é
        cancelado. Ao criar a regra ou mudar o prazo, ela só vale para ausências que vencem a partir de hoje.
      </p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Salvando..." : "Salvar regra"}
        </button>
        <Link href={cancelHref} className={secondaryButton}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
