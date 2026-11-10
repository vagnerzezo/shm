"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SearchIcon, XIcon } from "@/app/_components/icons";
import { FormError, card, fieldClass, labelClass, primaryButton, secondaryButton } from "@/app/_components/ui";
import { agendaHref } from "@/app/_lib/agenda";
import { formatPhone, normalize } from "@/app/_lib/format";
import { createReservationByAdmin } from "@/app/_lib/reservation-actions";
import { categoriesOf, formatDuration, formatPrice, type Service } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

type CustomerOption = { id: string; name: string; phone: string; email: string };

const MAX_RESULTS = 6;

function CustomerPicker({ customers, initialId }: { customers: CustomerOption[]; initialId: string }) {
  const [selected, setSelected] = useState(() => customers.find((c) => c.id === initialId) ?? null);
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());
  const digits = query.replace(/\D/g, "");
  const matches = q
    ? customers
        .filter(
          (c) =>
            normalize(`${c.name} ${c.email}`).includes(q) || (digits.length >= 3 && c.phone.includes(digits)),
        )
        .slice(0, MAX_RESULTS)
    : [];

  if (selected) {
    return (
      <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-black bg-white px-3 py-2">
        <input type="hidden" name="cliente" value={selected.id} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-black">{selected.name}</p>
          <p className="truncate text-xs text-black/60">
            {formatPhone(selected.phone)} · {selected.email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-label="Trocar cliente"
          className="grid size-8 place-items-center rounded-md text-black/60 hover:bg-black/5 hover:text-black"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      <span className="relative block">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/50" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, e-mail ou telefone"
          aria-label="Buscar cliente"
          autoComplete="off"
          className={cn(fieldClass, "pl-9")}
        />
      </span>
      {q && (
        <ul className="mt-1 overflow-hidden rounded-lg border border-black/15 bg-white">
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-sm text-black/60">
              Nenhum cliente encontrado.{" "}
              <Link href="/admin/clientes/novo?voltar=reserva" className="font-semibold text-black underline underline-offset-4">
                Cadastrar cliente
              </Link>
            </li>
          ) : (
            matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="block w-full px-3 py-2 text-left hover:bg-black/5"
                >
                  <span className="block truncate text-sm font-semibold text-black">{c.name}</span>
                  <span className="block truncate text-xs text-black/60">
                    {formatPhone(c.phone)} · {c.email}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function NewReservationForm({
  customers,
  services,
  date,
  today,
  times,
  customerId,
}: {
  customers: CustomerOption[];
  services: Service[];
  date: string;
  today: string;
  times: string[];
  customerId: string;
}) {
  const [state, action, pending] = useActionState(createReservationByAdmin, { error: null });
  const [serviceId, setServiceId] = useState("");
  const service = services.find((s) => s.id === serviceId);

  return (
    <form action={action} className={cn(card, "flex max-w-2xl flex-col gap-5 p-5")}>
      <div>
        <span className={labelClass}>Cliente</span>
        <CustomerPicker customers={customers} initialId={customerId} />
      </div>

      <label>
        <span className={labelClass}>Serviço</span>
        <select
          name="servico"
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className={cn(fieldClass, "mt-1.5")}
        >
          <option value="" disabled>
            Escolha o serviço
          </option>
          {categoriesOf(services).map((category) => (
            <optgroup key={category} label={category}>
              {services
                .filter((s) => s.category === category)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {service && (
          <span className="mt-1.5 block text-xs text-black/60">
            {formatDuration(service.durationMinutes)} · {formatPrice(service.priceCents)}
            {service.professional ? ` · com ${service.professional}` : " · qualquer profissional"}
          </span>
        )}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Data</span>
          <input type="date" name="data" required defaultValue={date} className={cn(fieldClass, "mt-1.5")} />
          {/* Datas passadas são permitidas: servem para registrar um atendimento já feito. */}
          <span className="mt-1.5 block text-xs text-black/50">Pode ser uma data passada, para registrar um atendimento.</span>
        </label>
        <label>
          <span className={labelClass}>Horário</span>
          <input
            type="time"
            name="hora"
            required
            step={300}
            list="horarios-nova"
            className={cn(fieldClass, "mt-1.5")}
          />
          <datalist id="horarios-nova">
            {times.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      </div>

      <label>
        <span className={labelClass}>Observação (opcional)</span>
        <textarea
          name="observacao"
          rows={2}
          maxLength={300}
          placeholder="Ex.: cliente pediu para chegar 10 min antes"
          className={cn(fieldClass, "mt-1.5 h-auto py-2.5")}
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-black">
        <input type="checkbox" name="avisar" defaultChecked className="mt-0.5 size-4 shrink-0 accent-[#121212]" />
        Enviar confirmação ao cliente pelo chat e por e-mail
      </label>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Marcando..." : "Marcar horário"}
        </button>
        <Link href={agendaHref("dia", date < today ? today : date)} className={secondaryButton}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
