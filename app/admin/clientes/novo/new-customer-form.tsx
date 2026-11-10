"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormError, card, fieldClass, labelClass, primaryButton, secondaryButton } from "@/app/_components/ui";
import { createCustomer } from "@/app/_lib/customer-actions";
import { generatePassword } from "@/app/_lib/password";
import { cn } from "@/lib/utils";

const box = "mt-0.5 size-4 shrink-0 accent-[#121212]";

export function NewCustomerForm({ back }: { back: string }) {
  const [state, action, pending] = useActionState(createCustomer, { error: null });
  // Já vem uma senha pronta: o admin só precisa passá-la ao cliente.
  const [password, setPassword] = useState(() => generatePassword());

  return (
    <form action={action} className={cn(card, "flex max-w-2xl flex-col gap-4 p-5")}>
      {back && <input type="hidden" name="voltar" value={back} />}
      <label>
        <span className={labelClass}>Nome completo</span>
        <input name="nome" required minLength={2} autoComplete="off" className={cn(fieldClass, "mt-1.5")} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Telefone / WhatsApp</span>
          <input
            name="telefone"
            type="tel"
            required
            inputMode="tel"
            placeholder="(51) 99999-9999"
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
        <label>
          <span className={labelClass}>E-mail</span>
          <input name="email" type="email" required maxLength={120} className={cn(fieldClass, "mt-1.5")} />
          <span className="mt-1 block text-xs text-black/50">É o login do cliente no site.</span>
        </label>
      </div>

      <label>
        <span className={labelClass}>Senha de acesso</span>
        <span className="mt-1.5 flex gap-2">
          <input
            name="senha"
            required
            minLength={8}
            maxLength={100}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            className={cn(fieldClass, "font-mono")}
          />
          <button type="button" onClick={() => setPassword(generatePassword())} className={cn(secondaryButton, "shrink-0")}>
            Gerar outra
          </button>
        </span>
        <span className="mt-1 block text-xs text-black/50">
          Anote e passe ao cliente. Ele pode trocar depois; você também pode redefinir na ficha dele.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Comunicações autorizadas</legend>
        <label className="mt-1 flex items-start gap-3 text-sm text-black">
          <input type="checkbox" name="aceita_email" className={box} />
          Aceita receber e-mails
        </label>
        <label className="flex items-start gap-3 text-sm text-black">
          <input type="checkbox" name="aceita_mensagem" className={box} />
          Aceita receber mensagens no chat
        </label>
        <p className="text-xs text-black/60">Só marque se o cliente autorizou.</p>
      </fieldset>

      <label>
        <span className={labelClass}>Observações internas (opcional)</span>
        <textarea
          name="observacao"
          rows={3}
          maxLength={1000}
          placeholder="Preferências, alergias, estilo de corte... O cliente não vê."
          className={cn(fieldClass, "mt-1.5 h-auto py-2.5")}
        />
      </label>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Cadastrando..." : back ? "Cadastrar e marcar horário" : "Cadastrar cliente"}
        </button>
        <Link href={back ? "/admin/agenda/nova" : "/admin/clientes"} className={secondaryButton}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
