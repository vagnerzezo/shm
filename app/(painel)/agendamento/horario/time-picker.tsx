"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CalendarIcon, XIcon } from "@/app/_components/icons";
import { clientPrimary, displayClass } from "@/app/_components/client/ui";
import {
  addDays,
  formatLongDate,
  formatShortMonth,
  formatWeekday,
  getSlots,
  type AvailabilityRules,
  type Busy,
  type DaySlots,
} from "@/app/_lib/availability";
import { endTime, itemKey, withItems } from "@/app/_lib/booking";
import { formatDuration, formatPrice, type Service } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
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
  /** Remarcando uma reserva: o horário leva à confirmação da troca, não ao carrinho. */
  reschedule?: { id: string; currentLabel: string };
};

function nextHref(carry: string[], serviceId: string, date: string, time: string, reschedule?: Props["reschedule"]) {
  if (reschedule) return `/reservas/${reschedule.id}/remarcar?data=${date}&hora=${time}`;
  return withItems("/agendamento/confirmacao", [...carry, itemKey(serviceId, date, time)]);
}

const shortWeekday = (date: string) => formatWeekday(date).slice(0, 3);
/** "Sex, 27 nov" */
const shortDate = (date: string) => `${shortWeekday(date)}, ${Number(date.slice(8))} ${formatShortMonth(date).toLowerCase()}`;
const freeLabel = (n: number) => (n === 1 ? "1 livre" : `${n} livres`);

function ServiceCard({ service, carry, reschedule, className }: Pick<Props, "service" | "carry" | "reschedule"> & { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-[#e7e5e4] bg-white py-3 pr-3 pl-3.5 lg:py-2.5 lg:pl-4", className)}>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{service.name}</span>
        <span className="block text-[13px] text-[#5c5c5a]">
          {[service.professional, formatDuration(service.durationMinutes), formatPrice(service.priceCents)].filter(Boolean).join(" · ")}
        </span>
        {reschedule && (
          <span className="block text-[13px] text-[#5c5c5a]">
            Horário atual: <span className="font-semibold text-[#121212]">{reschedule.currentLabel}</span>
          </span>
        )}
      </span>
      {!reschedule && (
        <Link
          href={withItems("/agendamento", carry)}
          className="flex h-9 shrink-0 items-center rounded-[10px] border border-[#e7e5e4] px-3 text-[13px] font-semibold transition hover:border-[#121212]"
        >
          Trocar
        </Link>
      )}
    </div>
  );
}

function TimeGrid({ times, picked, onPick, className }: { times: string[]; picked: string; onPick: (t: string) => void; className?: string }) {
  return (
    <div role="group" aria-label="Horários livres" className={cn("grid grid-cols-4 gap-2 lg:gap-2.5", className)}>
      {times.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={t === picked}
          onClick={() => onPick(t)}
          className={cn(
            "h-12 rounded-xl text-[15px] font-semibold transition",
            t === picked ? "bg-[#121212] text-white" : "border border-[#e7e5e4] bg-white hover:border-[#121212]",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ContinueButton({ href, className }: { href: string | null; className?: string }) {
  return href ? (
    <Link href={href} className={cn(clientPrimary, className)}>
      Continuar
    </Link>
  ) : (
    <button type="button" disabled className={cn(clientPrimary, className)}>
      Continuar
    </button>
  );
}

export function TimePicker({ service, now, busy, rules, suggested, carry, reschedule }: Props) {
  const first = suggested[0]?.date ?? "";
  const [date, setDate] = useState(first);
  const [time, setTime] = useState("");
  const [month, setMonth] = useState((first || now.date).slice(0, 7));
  const dialog = useRef<HTMLDialogElement>(null);

  const slotsOf = (d: string) => getSlots(service, d, now, busy, rules);
  const times = date ? slotsOf(date) : [];
  // Dia escolhido no calendário que não está entre os sugeridos entra no começo da faixa.
  const strip: DaySlots[] =
    date && !suggested.some((d) => d.date === date) ? [{ date, times }, ...suggested] : suggested;

  function pickDay(d: string) {
    setDate(d);
    setTime("");
    setMonth(d.slice(0, 7));
  }

  const href = date && time ? nextHref(carry, service.id, date, time, reschedule) : null;
  const pickedLabel = date && time ? `${shortDate(date)} · ${time}` : "Escolha um horário";
  const dayTitle = date ? `${formatWeekday(date)}, ${formatLongDate(date)}` : "";

  const calendar = (
    <Calendar
      month={month}
      minMonth={now.date.slice(0, 7)}
      maxMonth={addDays(now.date, rules.settings.maxDaysAhead).slice(0, 7)}
      selected={date}
      isAvailable={(d) => slotsOf(d).length > 0}
      onMonthChange={setMonth}
      onSelect={(d) => {
        pickDay(d);
        dialog.current?.close();
      }}
    />
  );

  return (
    <>
      {/* ---------- Celular ---------- */}
      <div className="flex flex-col gap-4 lg:hidden">
        <ServiceCard service={service} carry={carry} reschedule={reschedule} />
        <h1 className={cn(displayClass, "text-[34px]")}>Quando?</h1>

        <div role="group" aria-label="Escolha o dia" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {strip.map((d) => {
            const on = d.date === date;
            return (
              <button
                key={d.date}
                type="button"
                aria-pressed={on}
                aria-label={`${formatWeekday(d.date)}, ${formatLongDate(d.date)}, ${freeLabel(d.times.length)}`}
                onClick={() => pickDay(d.date)}
                className={cn(
                  "flex h-[84px] w-16 shrink-0 flex-col items-center justify-center gap-px rounded-2xl",
                  on ? "bg-[#121212] text-white" : "border border-[#e7e5e4] bg-white",
                )}
              >
                <span className="text-xs font-semibold opacity-75">{shortWeekday(d.date)}</span>
                <span className="text-xl font-bold">{Number(d.date.slice(8))}</span>
                <span className="text-[11px] opacity-75">{freeLabel(d.times.length)}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="flex h-[84px] w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#a8a29e] text-[11px] font-semibold text-[#3f3f3d]"
          >
            <CalendarIcon className="size-5" />
            Outra data
          </button>
        </div>

        {date ? (
          <section>
            <h2 className="mb-2.5 text-sm font-bold">
              {dayTitle} <span className="font-medium text-[#5c5c5a]">· {freeLabel(times.length)}</span>
            </h2>
            <TimeGrid times={times} picked={time} onPick={setTime} />
          </section>
        ) : (
          <p className="text-sm text-[#5c5c5a]">Nenhum horário livre nos próximos dias. Toque em Outra data.</p>
        )}

        {/* Espaço da barra de ação fixa. */}
        <div aria-hidden="true" className="h-[calc(96px+env(safe-area-inset-bottom))]" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-black/8 bg-white/96 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-md">
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-[#5c5c5a]">Escolhido</span>
            <span className="block truncate text-[15px] font-bold">{pickedLabel}</span>
          </span>
          <ContinueButton href={href} className="h-[52px] shrink-0" />
        </div>

        <dialog
          ref={dialog}
          aria-labelledby="outra-data"
          onClick={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.close();
          }}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl bg-white p-0 text-[#121212] shadow-2xl backdrop:bg-black/50"
        >
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 id="outra-data" className="text-lg font-bold">
              Escolha o dia
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Fechar"
              className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-black/5"
            >
              <XIcon className="size-5" />
            </button>
          </div>
          <div className="px-3 pb-4">{calendar}</div>
        </dialog>
      </div>

      {/* ---------- Computador ---------- */}
      <div className="flex flex-col gap-[22px] max-lg:hidden">
        <div className="flex items-end justify-between gap-6">
          <h1 className={cn(displayClass, "text-[52px]")}>{reschedule ? "Remarcar horário" : "Escolha o horário"}</h1>
          <ServiceCard service={service} carry={carry} reschedule={reschedule} className="max-w-md" />
        </div>

        <div className="grid grid-cols-[380px_minmax(0,1fr)] items-start gap-5">
          <section aria-label="Calendário" className="rounded-[20px] border border-[#e7e5e4] bg-white p-5">
            {calendar}
          </section>

          <section className="flex min-h-full flex-col rounded-[20px] border border-[#e7e5e4] bg-white px-[22px] py-5">
            {date ? (
              <>
                <h2 className="text-[17px] font-bold">{dayTitle}</h2>
                <p className="mt-0.5 mb-4 text-[13px] text-[#5c5c5a]">
                  {times.length === 1 ? "1 horário livre" : `${times.length} horários livres`}
                </p>
                <TimeGrid times={times} picked={time} onPick={setTime} />
              </>
            ) : (
              <p className="text-sm text-[#5c5c5a]">Escolha um dia com horário livre no calendário.</p>
            )}
            <div aria-hidden="true" className="min-h-5 flex-1" />
            <div className="flex items-center justify-between gap-4 border-t border-[#f0efee] pt-5">
              <span>
                <span className="block text-xs text-[#5c5c5a]">Escolhido</span>
                <span className="block text-base font-bold">
                  {date && time ? `${shortDate(date)} · ${time} – ${endTime(time, service.durationMinutes)}` : "Escolha um horário"}
                </span>
              </span>
              <ContinueButton href={href} className="h-12 rounded-xl" />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
