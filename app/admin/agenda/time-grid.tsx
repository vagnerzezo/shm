import Link from "next/link";
import { agendaHref, formatWeekdayShort, gridOf, HOUR_HEIGHT, placeDay, toneOf } from "@/app/_lib/agenda";
import { closureOn, isClosed, toTime, type AvailabilityRules } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import type { AgendaReservation } from "@/app/_lib/reservations";
import type { Professional } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { NowLine } from "./now-line";

/** Grade de horários usada pelas visões de semana (7 colunas) e de dia (1 coluna). */
export function TimeGrid({
  days,
  today,
  reservations,
  selectedId,
  rules,
  professionals,
}: {
  days: string[];
  today: string;
  reservations: AgendaReservation[];
  selectedId?: string;
  rules: AvailabilityRules;
  professionals: Professional[];
}) {
  const single = days.length === 1;
  const grid = gridOf(rules.settings);
  const gridHours = grid.hours;
  const columns = { gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-width:thin]">
      <div className={cn(!single && "min-w-[720px]")}>
        {!single && (
          <div style={columns} className="sticky top-0 z-20 grid border-b border-black/10 bg-white">
            <div />
            {days.map((d) => (
              <Link
                key={d}
                href={agendaHref("dia", d)}
                className="flex items-center justify-center gap-1.5 border-l border-black/10 py-2 text-xs text-black/60 transition hover:bg-black/5"
              >
                {formatWeekdayShort(d)}
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full font-semibold",
                    d === today ? "bg-[#121212] text-white" : "text-black",
                  )}
                >
                  {Number(d.slice(8))}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div style={columns} className="relative grid">
          <div aria-hidden="true">
            {gridHours.map((m) => (
              <div key={m} style={{ height: HOUR_HEIGHT }} className="relative">
                <span className="absolute -top-2 right-2 text-xs text-black/50">
                  {m === gridHours[0] ? "" : toTime(m)}
                </span>
              </div>
            ))}
          </div>

          {days.map((d) => {
            const studioClosure = closureOn(d, rules);
            // Fechamentos só de um profissional não escurecem o dia: o outro atende.
            const partial = rules.closures.filter((c) => c.professional && c.start <= d && d <= c.end);
            return (
              <div
                key={d}
                className={cn("relative border-l border-black/10", isClosed(d, rules) && "bg-black/[0.04]")}
                style={{ height: gridHours.length * HOUR_HEIGHT }}
              >
                {gridHours.map((m) => (
                  <div
                    key={m}
                    aria-hidden="true"
                    style={{ top: ((m - gridHours[0]) / 60) * HOUR_HEIGHT }}
                    className="absolute inset-x-0 border-t border-black/10"
                  />
                ))}

                {isClosed(d, rules) ? (
                  <p className="absolute inset-x-1 top-4 text-center text-xs font-semibold tracking-widest text-black/45 uppercase">
                    Fechado
                    {studioClosure && (
                      <span className="block normal-case tracking-normal">{studioClosure.reason}</span>
                    )}
                  </p>
                ) : (
                  partial.length > 0 && (
                    <div className="absolute inset-x-1 top-1 z-10 flex flex-col gap-0.5">
                      {partial.map((c) => (
                        <p
                          key={c.id}
                          className="truncate rounded bg-black/10 px-1.5 py-0.5 text-[11px] font-semibold text-black/70"
                        >
                          {c.professional}: {c.reason}
                        </p>
                      ))}
                    </div>
                  )
                )}

                {placeDay(
                  reservations.filter((r) => r.date === d),
                  grid,
                ).map(({ reservation: r, top, height, lane, lanes }) => (
                  <Link
                    key={r.id}
                    // Abre o dia com os detalhes da reserva ao lado.
                    href={agendaHref("dia", r.date, r.id)}
                    aria-current={r.id === selectedId ? "true" : undefined}
                    style={{
                      top: top + 2,
                      height: height - 4,
                      left: `calc(${(lane / lanes) * 100}% + 4px)`,
                      width: `calc(${100 / lanes}% - 8px)`,
                    }}
                    className={cn(
                      "absolute z-10 overflow-hidden rounded-md border px-2 py-1 text-xs transition",
                      toneOf(r, professionals).event,
                      r.id === selectedId && "ring-2 ring-black/70",
                    )}
                  >
                    <span className="block truncate font-semibold">{r.customer.name}</span>
                    <span className="block truncate">
                      {r.time} – {endTime(r.time, r.service.durationMinutes)}
                      {single && ` · ${r.service.name}`}
                    </span>
                    {!single && <span className="block truncate opacity-80">{r.service.name}</span>}
                  </Link>
                ))}

                {d === today && <NowLine start={grid.start} end={grid.end} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
