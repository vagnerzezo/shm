import Link from "next/link";
import { agendaHref, formatWeekdayShort, monthWeeks, toneOf } from "@/app/_lib/agenda";
import { closureOn, isClosed, type AvailabilityRules } from "@/app/_lib/availability";
import type { AgendaReservation } from "@/app/_lib/reservations";
import type { Professional } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

const MAX_PER_DAY = 3;

export function MonthView({
  date,
  today,
  reservations,
  rules,
  professionals,
}: {
  date: string;
  today: string;
  reservations: AgendaReservation[];
  rules: AvailabilityRules;
  professionals: Professional[];
}) {
  const month = date.slice(0, 7);
  const weeks = monthWeeks(month);

  return (
    <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
      <div className="grid min-h-full min-w-[720px] grid-rows-[auto_1fr]">
        <div className="grid grid-cols-7 border-b border-black/10">
          {weeks[0].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-black/60">
              {formatWeekdayShort(d)}
            </div>
          ))}
        </div>

        <div className="grid auto-rows-fr grid-cols-7">
          {weeks.flat().map((d) => {
            const inMonth = d.startsWith(month);
            const items = reservations.filter((r) => r.date === d);
            const extra = items.length - MAX_PER_DAY;
            return (
              <div
                key={d}
                className={cn(
                  "flex min-h-28 flex-col gap-1 border-b border-r border-black/10 p-2 [&:nth-child(7n)]:border-r-0",
                  (!inMonth || isClosed(d, rules)) && "bg-black/[0.04]",
                )}
              >
                <Link
                  href={agendaHref("dia", d)}
                  aria-label={`Ver o dia ${Number(d.slice(8))}`}
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-sm font-semibold transition hover:bg-black/10",
                    d === today
                      ? "bg-[#121212] text-white hover:bg-black/80"
                      : inMonth
                        ? "text-black"
                        : "text-black/35",
                  )}
                >
                  {Number(d.slice(8))}
                </Link>
                {closureOn(d, rules) && (
                  <span className="truncate px-1.5 text-xs font-semibold text-black/50">
                    Fechado · {closureOn(d, rules)!.reason}
                  </span>
                )}
                {rules.closures
                  .filter((c) => c.professional && c.start <= d && d <= c.end)
                  .map((c) => (
                    <span key={c.id} className="truncate px-1.5 text-xs font-semibold text-black/50">
                      {c.professional}: {c.reason}
                    </span>
                  ))}
                {items.slice(0, MAX_PER_DAY).map((r) => (
                  <Link
                    key={r.id}
                    href={agendaHref("dia", d, r.id)}
                    className={cn(
                      "flex items-center justify-between gap-1 rounded-md border px-1.5 py-1 text-xs font-semibold transition",
                      toneOf(r, professionals).event,
                    )}
                  >
                    <span className="truncate">{r.customer.name}</span>
                    <span className="shrink-0 font-medium opacity-80">{r.time}</span>
                  </Link>
                ))}
                {extra > 0 && (
                  <Link
                    href={agendaHref("dia", d)}
                    className="px-1.5 text-xs font-semibold text-black/60 hover:text-black"
                  >
                    +{extra} {extra === 1 ? "reserva" : "reservas"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
