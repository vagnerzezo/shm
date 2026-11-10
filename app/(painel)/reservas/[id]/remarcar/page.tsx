import type { Metadata } from "next";
import Link from "next/link";
import { PanelHeader } from "@/app/_components/panel-header";
import { EmptyState } from "@/app/_components/ui";
import { requireUser } from "@/app/_lib/auth";
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
  const now = nowInStudio();
  const reservation = (await getReservations(user.id)).find((r) => r.id === id);

  const header = (
    <PanelHeader>
      <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">Remarcar horário</h1>
      <p className="mt-1 text-sm text-black/70">Escolha o novo dia e horário. O estúdio é avisado na hora.</p>
    </PanelHeader>
  );

  const unavailable = (message: string) => (
    <>
      {header}
      <div className="mt-7">
        <EmptyState>
          {message}{" "}
          <Link href="/reservas" className="font-semibold text-black underline underline-offset-4">
            Voltar para Minhas reservas
          </Link>
        </EmptyState>
      </div>
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
        {header}
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
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
      {header}
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {(date || time) && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Esse horário não está mais disponível. Escolha outro.
          </p>
        )}
        <TimePicker
          service={service}
          now={now}
          busy={busy}
          rules={rules}
          suggested={getSuggestedDays(service, now, busy, rules)}
          carry={[]}
          reschedule={{ id: reservation.id, currentLabel: current }}
        />
      </div>
    </>
  );
}
