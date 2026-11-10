import type { Metadata } from "next";
import Link from "next/link";
import { CalendarIcon, CheckIcon, SwapIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import {
  formatLongDate,
  formatShortMonth,
  formatWeekday,
  nowInStudio,
} from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { requireUser } from "@/app/_lib/auth";
import { getReservations, isPast, type Reservation } from "@/app/_lib/reservations";
import { formatDuration, formatPrice } from "@/app/_lib/services";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = {
  title: "Minhas reservas | Studio Heitor Macks",
};

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#121212] px-5 text-sm font-semibold text-white transition hover:bg-black/80";

function ReservationCard({ reservation, past }: { reservation: Reservation; past: boolean }) {
  const { id, service, date, time, note, attendance } = reservation;
  const missed = past && attendance === "faltou";
  return (
    <li
      className={`flex gap-6 rounded-xl border border-black/10 p-6 ${past ? "bg-white/50" : "bg-white/85"}`}
    >
      <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-black/15 pr-6 text-black sm:w-28">
        <span className="text-xs font-semibold tracking-widest">{formatShortMonth(date)}</span>
        <span className="text-4xl font-bold leading-tight">{Number(date.slice(8))}</span>
        <span className="text-sm font-semibold">{time}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold leading-snug text-black">{service.name}</h3>
            {missed && (
              <span className="mt-1 inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                Você não compareceu
              </span>
            )}
          </div>
          {!past && (
            <div className="flex shrink-0 flex-wrap justify-end gap-x-4 gap-y-1">
              <Link
                href={`/reservas/${id}/remarcar`}
                className="flex shrink-0 items-center gap-1.5 pt-1 text-sm font-semibold text-black hover:text-black/60"
              >
                <SwapIcon className="size-4" />
                Remarcar
              </Link>
              <CancelButton
                id={id}
                serviceName={service.name}
                when={`${formatWeekday(date)}, ${formatLongDate(date)} às ${time}`}
              />
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-black/70">
          {formatWeekday(date)}, {formatLongDate(date)} · {time} às{" "}
          {endTime(time, service.durationMinutes)}
        </p>
        <p className="mt-1 text-sm text-black/70">
          {service.professional && <>Profissional: {service.professional} · </>}
          {formatDuration(service.durationMinutes)} · Pagamento no dia
        </p>
        {note && <p className="mt-1 text-sm italic text-black/70">“{note}”</p>}
        {/* Falta não foi cobrada: o valor aparece riscado. */}
        <p className={`mt-2 text-lg font-bold ${missed ? "text-black/40 line-through" : "text-black"}`}>
          {formatPrice(service.priceCents)}
        </p>
      </div>
    </li>
  );
}

export default async function ReservasPage(props: PageProps<"/reservas">) {
  const { nova } = await props.searchParams;
  const customer = await requireUser("/reservas");
  const reservations = await getReservations(customer.id);
  const now = nowInStudio();
  const upcoming = reservations.filter((r) => !isPast(r, now));
  // Histórico do mais recente para o mais antigo.
  const past = reservations.filter((r) => isPast(r, now)).reverse();
  const created = Number(nova) || 0;

  return (
    <>
      <PanelHeader>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
          Minhas reservas
        </h1>
        <p className="mt-1 text-sm text-black/70">Olá, {customer.name}</p>
      </PanelHeader>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {created > 0 && (
          <p
            role="status"
            className="mb-6 flex items-center gap-3 rounded-xl border border-black/10 bg-white/85 px-5 py-4 font-semibold text-black"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#121212] text-white">
              <CheckIcon className="size-4" strokeWidth={3} />
            </span>
            {created === 1 ? "Reserva confirmada!" : `${created} reservas confirmadas!`} Te
            esperamos no estúdio.
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold tracking-widest text-black/70">PRÓXIMAS</h2>
          {upcoming.length > 0 && (
            <Link href="/agendamento" className={primaryButton}>
              <CalendarIcon className="size-4" />
              Novo agendamento
            </Link>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-4 rounded-xl border border-dashed border-black/25 py-14 text-center">
            <p className="text-black/70">Você não tem reservas marcadas.</p>
            <Link href="/agendamento" className={primaryButton}>
              <CalendarIcon className="size-4" />
              Agendar agora
            </Link>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {upcoming.map((r) => (
              <ReservationCard key={r.id} reservation={r} past={false} />
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-10 text-xs font-semibold tracking-widest text-black/70">
              ANTERIORES
            </h2>
            <ul className="mt-3 flex flex-col gap-4">
              {past.map((r) => (
                <ReservationCard key={r.id} reservation={r} past />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
