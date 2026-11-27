"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { clientPrimary } from "@/app/_components/client/ui";
import { confirmBooking } from "@/app/_lib/actions";
import { formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

type Props = {
  /** Nome e preço de cada item, para o resumo do computador. */
  lines: { key: string; name: string; priceCents: number }[];
  /** `null` quando o cliente ainda não entrou. */
  userName: string | null;
  /** Login que volta para esta mesma confirmação. */
  loginUrl: string;
  /** Coluna da esquerda (itens e observação), dentro do mesmo formulário. */
  children: ReactNode;
};

/**
 * Confirmação inteira num formulário só. Computador: itens à esquerda e resumo
 * fixo à direita. Celular: o resumo vira a barra presa embaixo.
 */
export function SummaryForm({ lines, userName, loginUrl, children }: Props) {
  const [state, action, pending] = useActionState(confirmBooking, { error: null });
  const total = lines.reduce((sum, l) => sum + l.priceCents, 0);

  return (
    <form action={action} className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
      {lines.map((l) => (
        <input key={l.key} type="hidden" name="item" value={l.key} />
      ))}

      <div className="flex flex-col gap-3.5">{children}</div>

      <aside className="flex flex-col gap-[18px] lg:sticky lg:top-0 lg:rounded-[20px] lg:border lg:border-[#e7e5e4] lg:bg-white lg:p-6">
        <h2 className="text-lg font-bold max-lg:hidden">Resumo</h2>

        <fieldset>
          <legend className="mb-2 text-[13px] font-bold">Pagamento</legend>
          <label className="flex h-[52px] items-center gap-3 rounded-[14px] border-[1.5px] border-[#121212] bg-white px-3.5 text-[15px] font-semibold">
            <input type="radio" name="pagamento" value="presencial" defaultChecked className="size-5 accent-[#121212]" />
            Pagar no dia (presencial)
          </label>
        </fieldset>

        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 border-t border-[#f0efee] pt-4 text-sm max-lg:hidden">
          {lines.map((l) => (
            <div key={l.key} className="contents">
              <dt className="text-[#5c5c5a]">{l.name}</dt>
              <dd>{formatPrice(l.priceCents)}</dd>
            </div>
          ))}
          <dt className="self-center text-base font-bold">Total</dt>
          <dd className="text-[26px] font-bold">{formatPrice(total)}</dd>
        </dl>

        {state.error && (
          <p role="alert" className="rounded-[14px] bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {state.error}
          </p>
        )}

        {/* Celular: espaço da barra fixa. */}
        <div aria-hidden="true" className="h-[calc(170px+env(safe-area-inset-bottom))] lg:hidden" />
        <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:border-black/8 max-lg:bg-white/96 max-lg:px-4 max-lg:pt-3.5 max-lg:pb-[calc(12px+env(safe-area-inset-bottom))] max-lg:backdrop-blur-md">
          <div className="mb-3 flex items-baseline justify-between lg:hidden">
            <span className="text-sm text-[#5c5c5a]">Total · pago no estúdio</span>
            <span className="text-[22px] font-bold">{formatPrice(total)}</span>
          </div>
          {userName ? (
            <>
              <button type="submit" disabled={pending} className={cn(clientPrimary, "h-[54px] w-full text-base")}>
                {pending ? "Confirmando..." : "Confirmar reserva"}
              </button>
              <p className="mt-2 truncate text-center text-xs text-[#5c5c5a] lg:mt-3 lg:text-[13px]">
                Confirmando como <b className="text-[#121212]">{userName}</b>
              </p>
            </>
          ) : (
            <>
              <Link href={loginUrl} className={cn(clientPrimary, "h-[54px] w-full text-base")}>
                Entrar para confirmar
              </Link>
              <p className="mt-2 text-center text-xs text-[#5c5c5a] lg:mt-3">
                É preciso ter uma conta para concluir. Os horários escolhidos ficam guardados enquanto você entra ou cria a conta.
              </p>
            </>
          )}
        </div>
      </aside>
    </form>
  );
}
