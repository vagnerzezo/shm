"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { settingsSections, type SectionId } from "@/app/_components/staff/nav";
import { cn } from "@/lib/utils";

/** Seções de Configurações: lista à esquerda no computador, pílulas que rolam no celular. */
export function SectionNav({ active }: { active: SectionId }) {
  const nav = useRef<HTMLElement>(null);
  // Celular: a seção aberta aparece mesmo se estiver no fim da fila.
  useEffect(() => {
    const el = nav.current;
    const current = el?.querySelector<HTMLElement>("[aria-current=page]");
    if (el && current && getComputedStyle(el).overflowX === "auto") el.scrollLeft = current.offsetLeft - el.offsetLeft - 16;
  }, [active]);

  return (
    <div className="relative -mx-4 lg:mx-0 lg:w-[210px] lg:shrink-0">
      <nav
        ref={nav}
        aria-label="Seções das configurações"
        className="flex gap-2 overflow-x-auto pr-12 pl-4 [scrollbar-width:none] lg:sticky lg:top-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0"
      >
        {settingsSections.map((s) => {
          const current = s.id === active;
          return (
            <Link
              key={s.id}
              href={s.id === "agenda" ? "/admin/configuracoes" : `/admin/configuracoes?secao=${s.id}`}
              aria-current={current ? "page" : undefined}
              scroll={false}
              className={cn(
                "flex h-[38px] shrink-0 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition",
                "lg:h-10 lg:rounded-[10px] lg:px-3",
                current
                  ? "border-[#121212] bg-[#121212] text-white lg:border-[#e7e5e4] lg:bg-white lg:font-bold lg:text-[#121212]"
                  : "border-[#e7e5e4] bg-white text-[#121212] lg:border-transparent lg:bg-transparent lg:text-[#3f3f3d] lg:hover:bg-black/5",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-[#f5f5f4]/0 to-[#f5f5f4] lg:hidden"
      />
    </div>
  );
}
