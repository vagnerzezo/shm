"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LockIcon, UserIcon } from "@/app/_components/icons";
import { confirmBooking } from "@/app/_lib/actions";
import { formatPrice } from "@/app/_lib/services";

type Props = {
  subtotalCents: number;
  itemKeys: string[];
  /** `null` quando o cliente ainda não entrou. */
  userName: string | null;
  /** Login que volta para esta mesma confirmação. */
  loginUrl: string;
};

const primaryButton =
  "mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#121212] font-semibold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70";

export function SummaryForm({ subtotalCents, itemKeys, userName, loginUrl }: Props) {
  const [state, action, pending] = useActionState(confirmBooking, { error: null });

  return (
    <form action={action} className="rounded-xl border border-black/10 bg-white p-7">
      {itemKeys.map((key) => (
        <input key={key} type="hidden" name="item" value={key} />
      ))}

      <h2 className="text-xl font-semibold text-black">Resumo</h2>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold tracking-widest text-black/70">
          FORMA DE PAGAMENTO
        </legend>
        <label className="mt-2.5 flex h-13 cursor-pointer items-center gap-3 rounded-lg border-2 border-black px-4 text-sm font-medium text-black">
          <input
            type="radio"
            name="pagamento"
            value="presencial"
            required
            defaultChecked
            className="size-5 accent-[#121212]"
          />
          Pagar no dia (presencial)
        </label>
      </fieldset>

      {userName && (
        <label className="mt-6 block">
          <span className="block text-sm font-semibold text-black">Observação</span>
          <span className="block text-sm text-black/70">(opcional)</span>
          <textarea
            name="observacao"
            rows={3}
            maxLength={300}
            placeholder="Algo que o profissional deva saber?"
            className="mt-2 w-full rounded-lg border border-black/20 px-4 py-3 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none"
          />
        </label>
      )}

      <dl className="mt-5 border-t border-black/15 pt-4">
        <div className="flex justify-between text-sm text-black/70">
          <dt>Subtotal</dt>
          <dd>{formatPrice(subtotalCents)}</dd>
        </div>
        <div className="mt-3 flex items-center justify-between text-black">
          <dt className="font-semibold">Total</dt>
          <dd className="text-2xl font-bold">{formatPrice(subtotalCents)}</dd>
        </div>
      </dl>

      {state.error && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}

      {userName ? (
        <>
          <button type="submit" disabled={pending} className={primaryButton}>
            <LockIcon className="size-4" />
            {pending ? "Confirmando..." : "Confirmar reserva"}
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-black/70">
            <UserIcon className="size-3.5" />
            Confirmando como <strong className="text-black">{userName}</strong>
          </p>
        </>
      ) : (
        <>
          <Link href={loginUrl} className={primaryButton}>
            <LockIcon className="size-4" />
            Entrar para confirmar
          </Link>
          <p className="mt-4 text-center text-xs text-black/70">
            É preciso ter uma conta para concluir. Os horários escolhidos ficam guardados
            enquanto você entra ou cria a conta.
          </p>
        </>
      )}
    </form>
  );
}
