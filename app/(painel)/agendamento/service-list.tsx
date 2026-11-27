"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRightIcon, ClockIcon, SearchIcon } from "@/app/_components/icons";
import { clientField, displayClass } from "@/app/_components/client/ui";
import { withItems } from "@/app/_lib/booking";
import {
  categoriesOf,
  formatDuration,
  formatPrice,
  PROFESSIONAL_DOT,
  professionalColorOf,
  type Professional,
  type Service,
} from "@/app/_lib/services";
import { cn } from "@/lib/utils";

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function Who({ service, professionals }: { service: Service; professionals: Professional[] }) {
  const color = professionalColorOf(service, professionals);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", color ? PROFESSIONAL_DOT[color] : "bg-[#78716c]")} />
      <span className="truncate">{service.professional ?? "Qualquer profissional"}</span>
    </span>
  );
}

export function ServiceList({
  services,
  professionals,
  carry,
}: {
  services: Service[];
  professionals: Professional[];
  carry: string[];
}) {
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const options = ["Todos", ...categoriesOf(services)];

  const q = normalize(query.trim());
  const visible = services.filter(
    (s) => (filter === "Todos" || s.category === filter) && (q === "" || normalize(s.name).includes(q)),
  );
  const hrefOf = (s: Service) => withItems(`/agendamento/horario?servico=${s.id}`, carry);

  return (
    <div className="flex flex-col gap-3.5 lg:gap-[22px]">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <h1 className={cn(displayClass, "text-4xl lg:text-[52px]")}>Escolha um serviço</h1>

        <div className="flex flex-col gap-3.5 lg:flex-row-reverse lg:items-center lg:gap-2.5">
          <label className="relative lg:w-[260px]">
            <span className="sr-only">Buscar serviço</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-[#5c5c5a] lg:left-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar serviço"
              className={cn(clientField, "h-12 pl-[42px] lg:h-[42px] lg:rounded-xl lg:pl-[38px]")}
            />
          </label>

          <div
            role="group"
            aria-label="Filtrar por"
            className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:gap-0 lg:rounded-xl lg:bg-[#e9e8e6] lg:p-[3px]"
          >
            {options.map((option) => {
              const active = option === filter;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(option)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition lg:rounded-[9px]",
                    active
                      ? "bg-[#121212] text-white lg:bg-white lg:text-[#121212] lg:shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                      : "border border-[#e7e5e4] bg-white text-[#121212] lg:border-0 lg:bg-transparent lg:text-[#5c5c5a] lg:hover:text-[#121212]",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#5c5c5a]">Nenhum serviço encontrado.</p>
      ) : (
        <>
          {/* Celular: lista compacta, a linha inteira é tocável. */}
          <ul className="overflow-hidden rounded-[18px] border border-[#e7e5e4] bg-white lg:hidden">
            {visible.map((s) => (
              <li key={s.id} className="border-b border-[#f0efee] last:border-0">
                <Link href={hrefOf(s)} className="flex min-h-16 items-center gap-3 px-3.5 py-3 active:bg-[#f5f5f4]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{s.name}</span>
                    <span className="flex items-center gap-1 text-[13px] text-[#5c5c5a]">
                      <Who service={s} professionals={professionals} />
                      <span className="shrink-0">· {formatDuration(s.durationMinutes)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-bold">{formatPrice(s.priceCents)}</span>
                  <ChevronRightIcon className="size-4 shrink-0 text-[#a8a29e]" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Computador: grade de cards clicáveis. */}
          <ul className="grid grid-cols-2 gap-4 max-lg:hidden xl:grid-cols-3">
            {visible.map((s) => (
              <li key={s.id}>
                <Link
                  href={hrefOf(s)}
                  className="flex h-full flex-col justify-between gap-4 rounded-[20px] border border-[#e7e5e4] bg-white p-5 transition hover:border-[#121212]"
                >
                  <span>
                    <span className="block text-base font-bold">{s.name}</span>
                    <span className="mt-1 block text-[13px] text-[#5c5c5a]">
                      <Who service={s} professionals={professionals} />
                    </span>
                  </span>
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[13px] text-[#5c5c5a]">
                      <ClockIcon className="size-4" />
                      {formatDuration(s.durationMinutes)}
                    </span>
                    <span className="text-lg font-bold">{formatPrice(s.priceCents)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
