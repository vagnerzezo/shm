"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/app/_components/icons";
import { addMonths, formatLongDate, formatMonth, monthGrid } from "@/app/_lib/availability";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  month: string;
  minMonth: string;
  maxMonth: string;
  selected: string;
  isAvailable: (date: string) => boolean;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
};

const navButton =
  "grid size-11 place-items-center rounded-lg border border-black/15 bg-white text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-black/15";

export function Calendar({
  month,
  minMonth,
  maxMonth,
  selected,
  isAvailable,
  onMonthChange,
  onSelect,
}: Props) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/85 p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={month <= minMonth}
          onClick={() => onMonthChange(addMonths(month, -1))}
          className={navButton}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <h3 aria-live="polite" className="text-lg font-semibold text-black">
          {formatMonth(month)}
        </h3>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={month >= maxMonth}
          onClick={() => onMonthChange(addMonths(month, 1))}
          className={navButton}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} aria-hidden="true" className="pb-2 text-xs font-semibold text-black/60">
            {d}
          </span>
        ))}
        {monthGrid(month).map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;
          const available = isAvailable(date);
          const active = date === selected;
          return (
            <button
              key={date}
              type="button"
              disabled={!available}
              aria-pressed={active}
              aria-label={formatLongDate(date)}
              onClick={() => onSelect(date)}
              className={`aspect-square w-full rounded-lg text-sm font-semibold transition ${
                active
                  ? "bg-[#121212] text-white"
                  : available
                    ? "border border-black/15 bg-white text-black hover:border-black"
                    : "cursor-not-allowed bg-black/[0.07] font-medium text-black/40"
              }`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-black/70">
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[3px] border border-black/30 bg-white" />
          Disponível
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[3px] bg-[#121212]" />
          Selecionado
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[3px] bg-black/10" />
          Indisponível
        </li>
      </ul>
    </div>
  );
}
