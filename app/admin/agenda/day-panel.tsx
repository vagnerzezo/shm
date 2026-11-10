import Link from "next/link";
import { ChatIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, CalendarIcon, UserIcon } from "@/app/_components/icons";
import { agendaHref, formatWeekdayShort, legendOf, monthWeeks, toneOf } from "@/app/_lib/agenda";
import { addMonths, formatLongDate, formatMonth, formatWeekday } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { formatPhone } from "@/app/_lib/format";
import { Badge } from "@/app/_components/ui";
import { statusOf, type AgendaReservation } from "@/app/_lib/reservations";
import { formatDuration, formatPrice, type Professional } from "@/app/_lib/services";
import { ReservationActions } from "./reservation-actions";
import { cn } from "@/lib/utils";

function MiniCalendar({
  date,
  today,
  busyDays,
}: {
  date: string;
  today: string;
  busyDays: Set<string>;
}) {
  const month = date.slice(0, 7);
  const weeks = monthWeeks(month);
  const arrow = "grid size-8 place-items-center rounded-md text-black/60 transition hover:bg-black/5 hover:text-black";

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <Link href={agendaHref("dia", `${addMonths(month, -1)}-01`)} aria-label="Mês anterior" className={arrow}>
          <ChevronLeftIcon className="size-4" />
        </Link>
        <p className="text-sm font-semibold text-black">{formatMonth(month)}</p>
        <Link href={agendaHref("dia", `${addMonths(month, 1)}-01`)} aria-label="Próximo mês" className={arrow}>
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-xs text-black/50">
        {weeks[0].map((d) => (
          <span key={d} className="py-1">
            {formatWeekdayShort(d).slice(0, 2)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {weeks.flat().map((d) => {
          const selected = d === date;
          return (
            <Link
              key={d}
              href={agendaHref("dia", d)}
              aria-current={selected ? "date" : undefined}
              className={cn(
                "relative mx-auto grid size-9 place-items-center rounded-full text-sm transition",
                selected
                  ? "bg-[#121212] font-semibold text-white"
                  : d === today
                    ? "font-bold text-black ring-1 ring-black/30"
                    : d.startsWith(month)
                      ? "text-black hover:bg-black/5"
                      : "text-black/30 hover:bg-black/5",
              )}
            >
              {Number(d.slice(8))}
              {busyDays.has(d) && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    selected ? "bg-white" : "bg-black/60",
                  )}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type Now = { date: string; minutes: number };

function Details({
  reservation: r,
  now,
  times,
}: {
  reservation: AgendaReservation;
  now: Now;
  times: string[];
}) {
  const row = "flex items-center gap-2 text-sm text-black/70";
  const status = statusOf(r, now);
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-black">{r.service.name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {status === "agendado" && <Badge tone="dark">Agendado</Badge>}
            {status === "realizado" && <Badge tone={r.attendance === "compareceu" ? "green" : "muted"}>Realizado</Badge>}
            {status === "faltou" && <Badge tone="red">Faltou</Badge>}
            {r.createdBy === "admin" && <Badge tone="outline">Marcado pelo estúdio</Badge>}
          </div>
        </div>
        <Link
          href={agendaHref("dia", r.date)}
          className="shrink-0 text-xs font-semibold text-black/60 underline underline-offset-4 hover:text-black"
        >
          Fechar
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <p className={row}>
          <CalendarIcon className="size-4 shrink-0" />
          {formatWeekday(r.date)}, {formatLongDate(r.date)}
        </p>
        <p className={row}>
          <ClockIcon className="size-4 shrink-0" />
          {r.time} – {endTime(r.time, r.service.durationMinutes)} · {formatDuration(r.service.durationMinutes)}
        </p>
        <p className={row}>
          <UserIcon className="size-4 shrink-0" />
          {r.service.professional ?? "Qualquer profissional"}
        </p>
      </div>

      <ReservationActions
        id={r.id}
        date={r.date}
        time={r.time}
        past={status !== "agendado"}
        attendance={r.attendance}
        times={times}
        today={now.date}
        label={`${r.service.name} em ${formatLongDate(r.date)} às ${r.time}`}
      />

      <div className="mt-4 rounded-lg border border-black/10 bg-white p-3">
        <p className="text-xs font-semibold tracking-widest text-black/50">CLIENTE</p>
        <p className="mt-1 font-semibold text-black">{r.customer.name}</p>
        <p className="text-sm text-black/70">{formatPhone(r.customer.phone)}</p>
        <p className="truncate text-sm text-black/70">{r.customer.email}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin/chat?cliente=${r.customer.id}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#121212] px-3 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            <ChatIcon className="size-4" />
            Conversar
          </Link>
          <Link
            href={`/admin/clientes/${r.customer.id}`}
            className="inline-flex h-9 items-center rounded-lg border border-black/20 bg-white px-3 text-sm font-semibold text-black transition hover:bg-black/5"
          >
            Ver cliente
          </Link>
        </div>
      </div>

      {r.note && <p className="mt-3 text-sm italic text-black/70">“{r.note}”</p>}
      <p className={cn("mt-3 text-lg font-bold text-black", status === "faltou" && "text-black/40 line-through")}>
        {formatPrice(r.service.priceCents)}
      </p>


    </div>
  );
}

function DayList({
  date,
  reservations,
  professionals,
}: {
  date: string;
  reservations: AgendaReservation[];
  professionals: Professional[];
}) {
  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold tracking-widest text-black/60">
        {reservations.length === 0
          ? "NENHUMA RESERVA"
          : `${reservations.length} ${reservations.length === 1 ? "RESERVA" : "RESERVAS"}`}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {reservations.map((r) => (
          <li key={r.id}>
            <Link
              href={agendaHref("dia", date, r.id)}
              className={cn("block rounded-md border px-3 py-2 text-sm transition", toneOf(r, professionals).event)}
            >
              <span className="flex justify-between gap-2 font-semibold">
                <span className="truncate">{r.customer.name}</span>
                <span className="shrink-0">{r.time}</span>
              </span>
              <span className="block truncate">{r.service.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/60">
        {legendOf(professionals).map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", l.dot)} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Coluna lateral da visão de dia: minicalendário e detalhes da reserva escolhida. */
export function DayPanel({
  date,
  today,
  reservations,
  selected,
  now,
  times,
  professionals,
}: {
  date: string;
  today: string;
  reservations: AgendaReservation[];
  selected: AgendaReservation | null;
  now: Now;
  times: string[];
  professionals: Professional[];
}) {
  return (
    <aside
      className={cn(
        // No mobile o painel aparece antes da grade só quando há uma reserva aberta.
        "shrink-0 flex-col divide-y divide-black/10 overflow-y-auto border-black/10 [scrollbar-width:thin] lg:flex lg:w-80 lg:border-l",
        selected ? "order-first flex border-b lg:order-none lg:border-b-0" : "hidden",
      )}
    >
      <div className="hidden lg:block">
        <MiniCalendar date={date} today={today} busyDays={new Set(reservations.map((r) => r.date))} />
      </div>
      {selected ? (
        <Details reservation={selected} now={now} times={times} />
      ) : (
        <DayList
          date={date}
          reservations={reservations.filter((r) => r.date === date)}
          professionals={professionals}
        />
      )}
    </aside>
  );
}
