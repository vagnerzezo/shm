"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, card, fieldClass, labelClass, primaryButton, secondaryButton } from "@/app/_components/ui";
import { saveService } from "@/app/_lib/catalog-actions";
import type { Service } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

const priceText = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function ServiceForm({
  service,
  professionals,
  categories,
}: {
  service?: Service;
  professionals: string[];
  categories: string[];
}) {
  const [state, action, pending] = useActionState(saveService, { error: null });

  return (
    <form action={action} className={cn(card, "flex flex-col gap-4 p-5")}>
      {service && <input type="hidden" name="id" value={service.id} />}
      <h2 className="text-lg font-bold text-black">{service ? "Editar serviço" : "Novo serviço"}</h2>

      <label>
        <span className={labelClass}>Nome</span>
        <input
          name="nome"
          required
          maxLength={80}
          defaultValue={service?.name}
          placeholder="Ex.: Corte com Heitor"
          className={cn(fieldClass, "mt-1.5")}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className={labelClass}>Categoria</span>
          <input
            name="categoria"
            required
            maxLength={40}
            list="categorias"
            defaultValue={service?.category}
            placeholder="Ex.: Barbearia"
            className={cn(fieldClass, "mt-1.5")}
          />
          <datalist id="categorias">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label>
          <span className={labelClass}>Profissional</span>
          <select name="profissional" defaultValue={service?.professional ?? ""} className={cn(fieldClass, "mt-1.5")}>
            <option value="">Qualquer profissional</option>
            {professionals.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>Duração (min)</span>
          <input
            name="duracao"
            type="number"
            required
            min={5}
            max={480}
            step={5}
            defaultValue={service?.durationMinutes ?? 45}
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
        <label>
          <span className={labelClass}>Preço (R$)</span>
          <input
            name="preco"
            required
            inputMode="decimal"
            defaultValue={service ? priceText(service.priceCents) : ""}
            placeholder="70,00"
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-black">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={service ? service.active !== false : true}
          className="size-4 accent-[#121212]"
        />
        Ativo (aparece para o cliente marcar)
      </label>

      <FormError message={state.error} />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Salvando..." : "Salvar serviço"}
        </button>
        <Link href="/admin/servicos" className={secondaryButton}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
