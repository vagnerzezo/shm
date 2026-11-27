import type { Metadata } from "next";
import Link from "next/link";
import { clientPrimary, clientSecondary, ClientTitle } from "@/app/_components/client/ui";
import { formatLongDate, formatShortMonth, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { keepBarberOut, requireUser } from "@/app/_lib/auth";
import { getReservations, isPast, type Reservation } from "@/app/_lib/reservations";
import { formatDuration, formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { CancelButton } from "./cancel-button";
import { CreatedNotice } from "./created-notice";

export const metadata: Metadata = {
  title: "Minhas reservas | Studio Heitor Macks",
};

function ReservationCard({ reservation, past }: { reservation: Reservation; past: boolean }) {
  const { id, service, date, time, note, attendance } = reservation;
  const missed = past && attendance === "faltou";
  const range = `${time} – ${endTime(time, service.durationMinutes)}`;
  const who = service.professional ?? "Qualquer profissional";

  const actions = !past && (
    <div className="flex shrink-0 gap-2">
      <Link href={`/reservas/${id}/remarcar`} className={cn(clientSecondary, "h-[38px] px-3.5 text-[13px] lg:h-10 lg:text-sm")}>
        Remarcar
      </Link>
      <CancelButton id={id} serviceName={service.name} when={`${formatWeekday(date)}, ${formatLongDate(date)} às ${time}`} />
    </div>
  );

  return (
    <li
      className={cn(
        "rounded-[18px] border border-[#e7e5e4] p-3.5 lg:flex lg:items-center lg:gap-5 lg:rounded-[20px] lg:px-5 lg:py-[18px]",
        past ? "bg-white/60" : "bg-white",
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3 lg:items-center lg:gap-5">
        <span className="w-[52px] shrink-0 rounded-xl bg-[#f5f5f4] py-1.5 text-center lg:w-[68px] lg:rounded-[14px] lg:py-2">
          <span className="block text-[11px] font-bold text-[#5c5c5a] uppercase">{formatWeekday(date).slice(0, 3)}</span>
          <span className="block text-xl leading-tight font-bold lg:text-[26px]">{Number(date.slice(8))}</span>
          <span className="block text-[11px] font-bold lg:hidden">{time}</span>
          <span className="block text-[11px] font-bold text-[#5c5c5a] max-lg:hidden">{formatShortMonth(date)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex justify-between gap-2">
            <span className="text-[15px] font-bold break-words lg:text-[17px]">{service.name}</span>
            <span className={cn("shrink-0 text-[15px] font-bold lg:hidden", missed && "text-[#a8a29e] line-through")}>
              {formatPrice(service.priceCents)}
            </span>
          </span>
          {missed && (
            <span className="mt-1 inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">Você não compareceu</span>
          )}
          <span className="block text-[13px] text-[#5c5c5a] lg:mt-0.5 lg:text-sm">
            <span className="lg:hidden">
              {range} · {who}
            </span>
            <span className="max-lg:hidden">
              {past && `${formatLongDate(date)} · `}
              {range} · {who} · {formatDuration(service.durationMinutes)} · pagamento no dia
            </span>
          </span>
          <span className="block text-[13px] text-[#5c5c5a] lg:hidden">
            {past ? formatLongDate(date) : "Pagamento no dia"}
          </span>
          {note && <span className="mt-1 block text-[13px] text-[#5c5c5a] italic">“{note}”</span>}
        </span>
      </div>
      <span className={cn("mr-3 text-lg font-bold max-lg:hidden", missed && "text-[#a8a29e] line-through")}>
        {formatPrice(service.priceCents)}
      </span>
      {actions && <div className="mt-3 pl-16 lg:mt-0 lg:pl-0">{actions}</div>}
    </li>
  );
}

export default async function ReservasPage(props: PageProps<"/reservas">) {
  const { nova, ver } = await props.searchParams;
  const customer = await requireUser("/reservas");
  keepBarberOut(customer);
  const reservations = await getReservations(customer.id);
  const now = nowInStudio();
  const upcoming = reservations.filter((r) => !isPast(r, now));
  // Histórico do mais recente para o mais antigo.
  const past = reservations.filter((r) => isPast(r, now)).reverse();
  const created = Number(nova) || 0;
  const showPast = ver === "anteriores";
  const shown = showPast ? past : upcoming;

  const tab = (active: boolean) =>
    cn(
      "grid h-9 place-items-center rounded-[9px] px-4 text-sm font-semibold transition",
      active ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-[#5c5c5a] hover:text-[#121212]",
    );

  return (
    <div className="flex flex-col gap-3.5 lg:gap-[22px]">
      <header className="flex flex-col gap-3.5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <ClientTitle title="Minhas reservas" description={<span className="max-lg:hidden">Olá, {customer.name}</span>} />
        <nav aria-label="Reservas" className="grid grid-cols-2 rounded-xl bg-[#e9e8e6] p-[3px] lg:flex">
          <Link href="/reservas" aria-current={showPast ? undefined : "page"} className={tab(!showPast)}>
            Próximas ({upcoming.length})
          </Link>
          <Link href="/reservas?ver=anteriores" aria-current={showPast ? "page" : undefined} className={tab(showPast)}>
            Anteriores
          </Link>
        </nav>
      </header>

      {created > 0 && !showPast && <CreatedNotice count={created} />}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-[#d6d3d1] px-6 py-14 text-center">
          <p className="text-[#5c5c5a]">{showPast ? "Nenhuma reserva anterior." : "Você não tem reservas marcadas."}</p>
          {!showPast && (
            <Link href="/agendamento" className={cn(clientPrimary, "h-11 rounded-xl text-sm")}>
              Agendar agora
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5 lg:gap-3">
          {shown.map((r) => (
            <ReservationCard key={r.id} reservation={r} past={showPast} />
          ))}
        </ul>
      )}
    </div>
  );
}
