import type { Metadata } from "next";
import Link from "next/link";
import { RescheduleHeader } from "@/app/_components/client/booking-header";
import { keepBarberOut, requireUser } from "@/app/_lib/auth";
import { formatLongDate, formatWeekday, getSlots, getSuggestedDays, nowInStudio } from "@/app/_lib/availability";
import { getBookableServices } from "@/app/_lib/catalog";
import { getBookingBusy, getReservations, isPast } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { findService } from "@/app/_lib/services";
import { TimePicker } from "../../../agendamento/horario/time-picker";
import { ConfirmReschedule } from "./confirm-reschedule";

export const metadata: Metadata = {
  title: "Remarcar horário | Studio Heitor Macks",
};

const when = (date: string, time: string) => `${formatWeekday(date)}, ${formatLongDate(date)} às ${time}`;

export default async function RemarcarPage(props: PageProps<"/reservas/[id]/remarcar">) {
  const { id } = await props.params;
  const { data, hora } = await props.searchParams;
  const user = await requireUser(`/reservas/${id}/remarcar`);
  keepBarberOut(user);
  const now = nowInStudio();
  const reservation = (await getReservations(user.id)).find((r) => r.id === id);

  const unavailable = (message: string) => (
    <>
      <RescheduleHeader title />
      <p className="rounded-[18px] border border-dashed border-[#d6d3d1] px-6 py-14 text-center text-sm text-[#5c5c5a]">
        {message}{" "}
        <Link href="/reservas" className="font-semibold text-[#121212] underline underline-offset-4">
          Voltar para Minhas reservas
        </Link>
      </p>
    </>
  );

  if (!reservation) return unavailable("Reserva não encontrada.");
  if (isPast(reservation, now)) return unavailable("Esse horário já passou e não pode ser remarcado.");
  // Serviço desativado no catálogo: só o estúdio consegue mexer.
  const active = findService(await getBookableServices(), reservation.serviceId);
  if (!active) return unavailable("Esse serviço não está mais disponível para remarcar pelo site. Fale com o estúdio pelas Mensagens.");

  // Mostra o preço combinado nesta reserva, que não muda ao remarcar.
  const service = { ...active, priceCents: reservation.service.priceCents };
  const rules = await getAvailabilityRules();
  // O horário atual desta reserva não bloqueia os vizinhos.
  const busy = await getBookingBusy(user.id, reservation.id);
  const current = when(reservation.date, reservation.time);

  // Horário escolhido: confirma a troca, se ele ainda estiver livre.
  const date = typeof data === "string" ? data : "";
  const time = typeof hora === "string" ? hora : "";
  const picked =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !(date === reservation.date && time === reservation.time) &&
    getSlots(service, date, now, busy, rules).includes(time);

  if (picked) {
    return (
      <>
        <RescheduleHeader title />
        <div>
          <ConfirmReschedule
            id={reservation.id}
            serviceName={service.name}
            from={current}
            to={when(date, time)}
            date={date}
            time={time}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <RescheduleHeader />
      <div>
        {(date || time) && (
          <p role="alert" className="mb-4 rounded-[14px] bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Esse horário não está mais disponível. Escolha outro.
          </p>
        )}
        <TimePicker
          service={service}
          now={now}
          busy={busy}
          rules={rules}
          suggested={getSuggestedDays(service, now, busy, rules, 4)}
          carry={[]}
          reschedule={{ id: reservation.id, currentLabel: current }}
        />
      </div>
    </>
  );
}
