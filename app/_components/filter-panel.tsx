"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SearchIcon } from "./icons";

/** No celular os filtros ficam recolhidos atrás de um botão; no desktop aparecem sempre. */
export function FilterPanel({ children, activeCount = 0 }: { children: ReactNode; activeCount?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-black/10 bg-white/85 px-4 text-sm font-semibold text-black lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SearchIcon className="size-4" />
          Buscar e filtrar
          {activeCount > 0 && (
            <span className="rounded-full bg-[#121212] px-2 py-0.5 text-xs text-white">{activeCount}</span>
          )}
        </span>
        <span aria-hidden className="text-black/50">
          {open ? "Fechar" : "Abrir"}
        </span>
      </button>
      <div className={cn(open ? "mt-2 block" : "hidden", "lg:mt-0 lg:block")}>{children}</div>
    </div>
  );
}
