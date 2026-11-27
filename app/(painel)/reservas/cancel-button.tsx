"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { clientDangerText, clientPrimary, clientSecondary } from "@/app/_components/client/ui";
import { cancelReservation } from "@/app/_lib/actions";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  serviceName: string;
  /** Ex.: "Quinta-feira, 8 de outubro de 2026 às 11:00" */
  when: string;
};

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(clientPrimary, "h-12 flex-1 bg-[#b91c1c] text-sm hover:bg-[#991b1b]")}
    >
      {pending ? "Cancelando..." : "Sim, cancelar"}
    </button>
  );
}

export function CancelButton({ id, serviceName, when }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = `cancelar-${id}`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={cn(clientDangerText, "h-[38px] text-[13px] lg:h-10 lg:text-sm")}
      >
        Cancelar
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        // Clique fora do conteúdo (no backdrop) fecha o modal.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 text-[#121212] shadow-2xl backdrop:bg-black/50"
      >
        <form action={cancelReservation} className="p-6">
          <input type="hidden" name="id" value={id} />
          <h2 id={titleId} className="text-xl font-bold">
            Cancelar reserva?
          </h2>
          <p className="mt-3 text-sm text-[#5c5c5a]">
            <strong className="font-semibold text-[#121212]">{serviceName}</strong>
            <br />
            {when}
          </p>
          <p className="mt-3 text-sm text-[#5c5c5a]">
            O horário fica livre para outros clientes e não dá para desfazer.
          </p>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className={cn(clientSecondary, "h-12 flex-1 rounded-[14px]")}
            >
              Manter reserva
            </button>
            <ConfirmButton />
          </div>
        </form>
      </dialog>
    </>
  );
}
