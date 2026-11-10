"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarIcon, ClockIcon, SearchIcon } from "@/app/_components/icons";
import { withItems } from "@/app/_lib/booking";
import { categoriesOf, formatDuration, formatPrice, initials, type Service } from "@/app/_lib/services";

type Filter = string;

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function ServiceList({ services, carry }: { services: Service[]; carry: string[] }) {
  const [filter, setFilter] = useState<Filter>("Todos");
  const [query, setQuery] = useState("");
  const categories = categoriesOf(services);

  const q = normalize(query.trim());
  const visible = services.filter(
    (s) =>
      (filter === "Todos" || s.category === filter) &&
      (q === "" || normalize(s.name).includes(q)),
  );

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2.5" role="group" aria-label="Filtrar serviços">
          {(["Todos", ...categories] as Filter[]).map((option) => {
            const active = option === filter;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option)}
                className={`h-11 rounded-full border border-black px-5 text-sm font-semibold transition ${
                  active ? "bg-[#121212] text-white" : "bg-white text-black hover:bg-black/5"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <label className="relative w-full md:max-w-[340px]">
          <span className="sr-only">Buscar serviço</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar serviço..."
            className="h-11 w-full rounded-lg border border-black/20 bg-white pl-4 pr-10 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none"
          />
          <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-black/60" />
        </label>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-color:#6b6b6b_transparent] [scrollbar-width:thin]">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-black/60">
            Nenhum serviço encontrado.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((service) => (
              <li
                key={service.id}
                className="flex flex-col justify-between gap-5 rounded-xl border border-black/10 bg-white/80 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#121212] text-sm font-bold text-white">
                    {initials(service.name)}
                  </span>
                  <div>
                    <h2 className="font-semibold leading-tight text-black">
                      {service.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-black/60">{service.category}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-black/70">
                      <ClockIcon className="size-4" />
                      {formatDuration(service.durationMinutes)}
                    </span>
                    <span className="text-lg font-bold text-black">
                      {formatPrice(service.priceCents)}
                    </span>
                  </div>
                  <Link
                    href={withItems(`/agendamento/horario?servico=${service.id}`, carry)}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#121212] text-sm font-semibold text-white transition hover:bg-black/80"
                  >
                    <CalendarIcon className="size-4" />
                    Reservar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
