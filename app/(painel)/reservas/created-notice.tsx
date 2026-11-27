"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, XIcon } from "@/app/_components/icons";

/** Aviso preto depois de confirmar; fechar tira o `?nova` da URL. */
export function CreatedNotice({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl bg-[#121212] py-3 pr-2 pl-3.5 text-white lg:py-3.5 lg:pl-[18px]">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[#121212] lg:size-[30px]">
        <CheckIcon className="size-4" strokeWidth={3} />
      </span>
      <span className="flex-1 text-sm font-semibold lg:text-[15px]">
        {count === 1 ? "Reserva confirmada!" : `${count} reservas confirmadas!`} Te esperamos no estúdio.
      </span>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => {
          setOpen(false);
          router.replace("/reservas", { scroll: false });
        }}
        className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/10"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
