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
        className="flex h-12 w-full items-center justify-between rounded-[14px] border border-[#e7e5e4] bg-white px-4 text-[15px] font-semibold text-[#121212] lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SearchIcon className="size-4" />
          Buscar e filtrar
          {activeCount > 0 && (
            <span className="rounded-full bg-[#121212] px-2 py-0.5 text-xs text-white">{activeCount}</span>
          )}
        </span>
        <span aria-hidden className="text-[#6b6b69]">
          {open ? "Fechar" : "Abrir"}
        </span>
      </button>
      <div className={cn(open ? "mt-2 block" : "hidden", "lg:mt-0 lg:block")}>{children}</div>
    </div>
  );
}
