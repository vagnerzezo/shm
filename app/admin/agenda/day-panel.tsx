import Link from "next/link";
import { CalendarIcon, ChatIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, PhoneIcon, UserIcon } from "@/app/_components/icons";
import { agendaHref, colorDot, formatWeekdayShort, legendOf, monthWeeks, toneOf } from "@/app/_lib/agenda";
import { initials } from "@/app/_lib/chat-format";
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

/** Detalhes da reserva aberta: no painel ao lado (computador) e na folha de baixo (celular). */
export function Details({
  reservation: r,
  now,
  times,
  chat,
  professionals,
  inSheet = false,
}: {
  reservation: AgendaReservation;
  now: Now;
  times: string[];
  /** Mostra "Conversar" (quem abre o Chat). */
  chat: boolean;
  professionals: Professional[];
  /** Na folha do celular o fechar é o X da folha. */
  inSheet?: boolean;
}) {
  const status = statusOf(r, now);
  const row = "flex items-center gap-3 px-3.5 py-3 text-[15px]";
  const pro = r.service.professional;
  const color = professionals.find((p) => p.name === pro)?.color;
  const tile =
    "flex h-16 flex-col items-center justify-center gap-1 rounded-[14px] bg-[#f5f5f4] text-xs font-semibold transition hover:bg-[#e7e5e4]";
  return (
    <div className={cn("flex flex-col gap-4", inSheet ? "px-5 pb-2" : "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {status === "agendado" && <Badge tone="dark">Agendado</Badge>}
            {status === "realizado" && <Badge tone={r.attendance === "compareceu" ? "green" : "muted"}>Realizado</Badge>}
            {status === "faltou" && <Badge tone="red">Faltou</Badge>}
            {r.createdBy === "admin" && <Badge tone="outline">Marcado pelo estúdio</Badge>}
          </div>
          <h2 className="mt-2.5 text-xl font-bold tracking-tight break-words lg:text-lg">{r.service.name}</h2>
          <p className={cn("mt-1 text-lg font-bold", status === "faltou" && "text-[#a8a29e] line-through")}>
            {formatPrice(r.service.priceCents)}
          </p>
        </div>
        {!inSheet && (
          <Link
            href={agendaHref("dia", r.date)}
            className="shrink-0 text-xs font-semibold text-[#5c5c5a] underline underline-offset-4 hover:text-[#121212]"
          >
            Fechar
          </Link>
        )}
      </div>

      <div className="divide-y divide-[#f0efee] rounded-2xl border border-[#e7e5e4]">
        <p className={row}>
          <CalendarIcon className="size-5 shrink-0 text-[#5c5c5a]" />
          {formatWeekday(r.date)}, {formatLongDate(r.date)}
        </p>
        <p className={row}>
          <ClockIcon className="size-5 shrink-0 text-[#5c5c5a]" />
          {r.time} – {endTime(r.time, r.service.durationMinutes)} · {formatDuration(r.service.durationMinutes)}
        </p>
        <p className={row}>
          <span className="grid w-5 place-items-center">
            <span className={cn("size-2.5 rounded-full", color ? colorDot(color) : "bg-[#78716c]")} />
          </span>
          {pro ?? "Qualquer profissional"}
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

      <div>
        <p className="mb-2 text-xs font-semibold tracking-[0.6px] text-[#5c5c5a] uppercase">Cliente</p>
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f0efee] text-sm font-bold">
            {initials(r.customer.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{r.customer.name}</p>
            <p className="truncate text-[13px] text-[#5c5c5a]">
              {[formatPhone(r.customer.phone), r.customer.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className={cn("mt-3 grid gap-2", chat ? "grid-cols-3" : "grid-cols-2")}>
          {chat && (
            <Link href={`/admin/chat?cliente=${r.customer.id}`} className={tile}>
              <ChatIcon className="size-5" />
              Conversar
            </Link>
          )}
          {r.customer.phone ? (
            <a href={`tel:+55${r.customer.phone.replace(/\D/g, "")}`} className={tile}>
              <PhoneIcon className="size-5" />
              Ligar
            </a>
          ) : (
            <span className={cn(tile, "cursor-not-allowed text-[#a8a29e] hover:bg-[#f5f5f4]")}>
              <PhoneIcon className="size-5" />
              Sem telefone
            </span>
          )}
          <Link href={`/admin/clientes/${r.customer.id}`} className={tile}>
            <UserIcon className="size-5" />
            Ver cliente
          </Link>
        </div>
      </div>

      {r.note && <p className="text-sm text-[#5c5c5a] italic">“{r.note}”</p>}
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
  admin,
  chatAllowed = false,
  calendar = true,
}: {
  date: string;
  today: string;
  reservations: AgendaReservation[];
  selected: AgendaReservation | null;
  now: Now;
  times: string[];
  professionals: Professional[];
  admin: boolean;
  /** Barbeiro que abre o Chat também vê "Conversar". */
  chatAllowed?: boolean;
  /** Minicalendário do mês acima da lista (o Início não usa). */
  calendar?: boolean;
}) {
  return (
    <aside
      className={cn(
        // No celular a reserva aberta vai para a folha de baixo (`ReservationSheet`).
        "hidden shrink-0 flex-col divide-y divide-[#f0efee] overflow-y-auto border-[#f0efee] [scrollbar-width:thin] lg:flex lg:w-80 lg:border-l",
      )}
    >
      <div className={calendar ? "hidden lg:block" : "hidden"}>
        <MiniCalendar date={date} today={today} busyDays={new Set(reservations.map((r) => r.date))} />
      </div>
      {selected ? (
        <Details reservation={selected} now={now} times={times} chat={admin || chatAllowed} professionals={professionals} />
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
