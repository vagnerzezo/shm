"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRightIcon } from "@/app/_components/icons";
import { clientCard, clientPrimary, clientSecondary } from "@/app/_components/client/ui";
import { FormError } from "@/app/_components/ui";
import { rescheduleMyReservation } from "@/app/_lib/account-actions";
import { cn } from "@/lib/utils";

type Props = { id: string; serviceName: string; from: string; to: string; date: string; time: string };

export function ConfirmReschedule({ id, serviceName, from, to, date, time }: Props) {
  const [state, action, pending] = useActionState(rescheduleMyReservation, { error: null });

  return (
    <form action={action} className={cn(clientCard, "max-w-xl p-5 lg:p-6")}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="data" value={date} />
      <input type="hidden" name="hora" value={time} />

      <h2 className="text-lg font-bold">{serviceName}</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-[14px] bg-[#f5f5f4] px-4 py-3">
          <dt className="text-xs font-semibold tracking-widest text-black/60">DE</dt>
          <dd className="mt-0.5 text-black/60 line-through">{from}</dd>
        </div>
        <ArrowRightIcon aria-hidden="true" className="hidden size-4 text-black/50 sm:block" />
        <div className="rounded-[14px] border-[1.5px] border-[#121212] px-4 py-3">
          <dt className="text-xs font-semibold tracking-widest text-black/60">PARA</dt>
          <dd className="mt-0.5 font-semibold text-black">{to}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-black/70">O estúdio recebe um aviso nas Mensagens. O valor não muda.</p>

      <FormError message={state.error} className="mt-4" />

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
        <Link href={`/reservas/${id}/remarcar`} className={cn(clientSecondary, "h-13 rounded-[14px] px-5")}>
          Escolher outro horário
        </Link>
        <button type="submit" disabled={pending} className={clientPrimary}>
          {pending ? "Remarcando..." : "Confirmar novo horário"}
        </button>
      </div>
    </form>
  );
}
