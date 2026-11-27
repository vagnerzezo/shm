"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/app/_components/icons";
import { addMonths, formatLongDate, formatMonth, monthGrid } from "@/app/_lib/availability";
import { cn } from "@/lib/utils";

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
  "grid size-11 place-items-center rounded-[10px] text-[#121212] transition hover:bg-[#f5f5f4] disabled:cursor-not-allowed disabled:text-[#d6d3d1] disabled:hover:bg-transparent";

/** Calendário do mês: dias com horário livre em negrito, o escolhido em preto. */
export function Calendar({ month, minMonth, maxMonth, selected, isAvailable, onMonthChange, onSelect }: Props) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={month <= minMonth}
          onClick={() => onMonthChange(addMonths(month, -1))}
          className={navButton}
        >
          <ChevronLeftIcon className="size-[18px]" />
        </button>
        <p aria-live="polite" className="text-[15px] font-bold first-letter:uppercase">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={month >= maxMonth}
          onClick={() => onMonthChange(addMonths(month, 1))}
          className={navButton}
        >
          <ChevronRightIcon className="size-[18px]" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-[#6b6b69]" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthGrid(month).map((date, i) => {
          if (!date) return <span key={`vazio-${i}`} />;
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
              className={cn(
                "h-[42px] rounded-[10px] text-sm transition",
                active
                  ? "bg-[#121212] font-bold text-white"
                  : available
                    ? "bg-[#f5f5f4] font-bold text-[#121212] hover:bg-[#e7e5e4]"
                    : "cursor-not-allowed text-[#a8a29e]",
              )}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="mt-3.5 text-xs text-[#5c5c5a]">Dias em negrito têm horário livre.</p>
    </div>
  );
}
