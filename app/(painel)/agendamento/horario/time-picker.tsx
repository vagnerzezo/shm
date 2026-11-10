"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  SwapIcon,
} from "@/app/_components/icons";
import {
  addDays,
  formatLongDate,
  formatWeekday,
  getSlots,
  type AvailabilityRules,
  type Busy,
  type DaySlots,
} from "@/app/_lib/availability";
import { itemKey, withItems } from "@/app/_lib/booking";
import { formatDuration, formatPrice, initials, type Service } from "@/app/_lib/services";
import { Calendar } from "./calendar";

type Props = {
  service: Service;
  now: { date: string; minutes: number };
  /** Intervalos em que o cliente já tem horário marcado. */
  busy: Busy[];
  /** Funcionamento e períodos fechados vindos das configurações. */
  rules: AvailabilityRules;
  suggested: DaySlots[];
  /** Itens já escolhidos antes deste serviço. */
  carry: string[];
};

const outlineButton =
  "flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-black bg-white px-5 text-sm font-semibold text-black transition hover:bg-black hover:text-white";

function slotHref(carry: string[], serviceId: string, date: string, time: string) {
  return withItems("/agendamento/confirmacao", [...carry, itemKey(serviceId, date, time)]);
}

function SlotLink({ href, time, large }: { href: string; time: string; large?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white/85 font-semibold text-black transition hover:border-black hover:bg-[#121212] hover:text-white ${
        large ? "h-12 text-base" : "h-11 w-[91px] text-sm"
      }`}
    >
      <ClockIcon className="size-3.5" />
      {time}
    </Link>
  );
}

function ServiceSummary({
  service,
  carry,
  action,
}: {
  service: Service;
  carry: string[];
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-black/10 bg-white/85 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="grid size-13 shrink-0 place-items-center rounded-full bg-[#121212] text-lg font-bold text-white">
          {initials(service.name)}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-[28px]">
            {service.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/70">
            <span>{service.category}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(service.durationMinutes)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-black">{formatPrice(service.priceCents)}</span>
            <Link
              href={withItems("/agendamento", carry)}
              className="ml-1 flex items-center gap-1.5 font-semibold text-black underline underline-offset-2 hover:text-black/70"
            >
              <SwapIcon className="size-3.5" />
              Alterar
            </Link>
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

function DateField({ date, active, onClick }: { date: string; active: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`flex h-16 w-full items-center justify-between rounded-lg bg-white/85 px-5 text-left ${
        active ? "border-2 border-black" : "border border-black/20 hover:border-black"
      }`}
    >
      <span>
        <span className="block text-xs text-black/70">Data</span>
        <span className={`block text-black ${date ? "font-semibold" : ""}`}>
          {date ? `${formatWeekday(date)}, ${formatLongDate(date)}` : "Selecione um dia específico"}
        </span>
      </span>
      <CalendarIcon className="size-5 text-black" />
    </button>
  );
}

export function TimePicker({ service, now, busy, rules, suggested, carry }: Props) {
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(now.date.slice(0, 7));

  const isAvailable = (d: string) => getSlots(service, d, now, busy, rules).length > 0;

  function openCalendar() {
    // Começa no primeiro dia com horário livre, para já mostrar opções.
    const first = suggested[0]?.date ?? "";
    setDate(first);
    setMonth((first || now.date).slice(0, 7));
    setPicking(true);
  }

  if (!picking) {
    return (
      <>
        <ServiceSummary
          service={service}
          carry={carry}
          action={
            <button type="button" className={outlineButton}>
              <PlusIcon className="size-4" />
              Fila de espera
            </button>
          }
        />

        <div className="mt-5">
          <DateField date="" active={false} onClick={openCalendar} />
        </div>

        <h2 className="mt-8 text-lg font-semibold text-black">Datas sugeridas</h2>
        {suggested.length === 0 && (
          <p className="mt-3 text-sm text-black/60">
            Nenhum horário livre nos próximos dias. Escolha uma data no calendário.
          </p>
        )}
        <ul className="mt-3">
          {suggested.map((day) => (
            <li
              key={day.date}
              className="grid gap-3 border-t border-dashed border-black/25 py-3.5 md:grid-cols-[214px_1fr] md:items-center"
            >
              <div>
                <p className="font-semibold text-black">{formatWeekday(day.date)}</p>
                <p className="text-sm text-black/60">{formatLongDate(day.date)}</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {day.times.map((time) => (
                  <SlotLink key={time} time={time} href={slotHref(carry, service.id, day.date, time)} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const times = date ? getSlots(service, date, now, busy, rules) : [];

  return (
    <>
      <ServiceSummary
        service={service}
        carry={carry}
        action={
          <button type="button" onClick={() => setPicking(false)} className={outlineButton}>
            <ArrowLeftIcon className="size-4" />
            Datas sugeridas
          </button>
        }
      />

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,390px)_1fr]">
        <Calendar
          month={month}
          minMonth={now.date.slice(0, 7)}
          maxMonth={addDays(now.date, rules.settings.maxDaysAhead).slice(0, 7)}
          selected={date}
          isAvailable={isAvailable}
          onMonthChange={setMonth}
          onSelect={setDate}
        />

        <div>
          <DateField date={date} active />

          <h2 className="mt-8 text-lg font-semibold text-black">Horários disponíveis</h2>
          {times.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {times.map((time) => (
                <SlotLink key={time} large time={time} href={slotHref(carry, service.id, date, time)} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-black/60">Selecione um dia disponível no calendário.</p>
          )}

          <p className="mt-6 text-sm text-black/70">
            Não achou um horário? Entre na <strong className="text-black">fila de espera</strong> e
            avisamos se abrir uma vaga.
          </p>
        </div>
      </div>
    </>
  );
}
