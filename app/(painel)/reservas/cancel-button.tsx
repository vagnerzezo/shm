"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { XIcon } from "@/app/_components/icons";
import { cancelReservation } from "@/app/_lib/actions";

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
      className="flex h-11 flex-1 items-center justify-center rounded-lg bg-[#121212] px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70"
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
        className="flex shrink-0 items-center gap-1.5 pt-1 text-sm font-semibold text-black hover:text-black/60"
      >
        <XIcon className="size-4" />
        Cancelar
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        // Clique fora do conteúdo (no backdrop) fecha o modal.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-black shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form action={cancelReservation} className="p-7">
          <input type="hidden" name="id" value={id} />
          <h2 id={titleId} className="text-xl font-semibold">
            Cancelar reserva?
          </h2>
          <p className="mt-3 text-sm text-black/70">
            <strong className="font-semibold text-black">{serviceName}</strong>
            <br />
            {when}
          </p>
          <p className="mt-3 text-sm text-black/70">
            O horário fica livre para outros clientes e não dá para desfazer.
          </p>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-black bg-white px-5 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
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
