import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuggestedDays, nowInStudio } from "@/app/_lib/availability";
import { busyOf, parseItems } from "@/app/_lib/booking";
import { getCurrentUser } from "@/app/_lib/auth";
import { getBookingBusy } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { getBookableServices } from "@/app/_lib/catalog";
import { findService } from "@/app/_lib/services";
import { PanelHeader } from "@/app/_components/panel-header";
import { TimePicker } from "./time-picker";

export const metadata: Metadata = {
  title: "Escolha um horário | Studio Heitor Macks",
};

export default async function HorarioPage(props: PageProps<"/agendamento/horario">) {
  const { servico, item } = await props.searchParams;
  const services = await getBookableServices();
  const service = findService(services, typeof servico === "string" ? servico : undefined);
  if (!service) redirect("/agendamento");

  const now = nowInStudio();
  const rules = await getAvailabilityRules();
  // Horários que o cliente já ocupa: reservas feitas + serviços no carrinho.
  const user = await getCurrentUser();
  const booked = await getBookingBusy(user?.id);
  const carryItems = parseItems(item, now, booked, rules, services);
  const busy = [...booked, ...busyOf(carryItems)];
  const suggested = getSuggestedDays(service, now, busy, rules);
  const carry = carryItems.map((i) => i.key);

  return (
    <>
      <PanelHeader step={1} />

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        <TimePicker service={service} now={now} busy={busy} rules={rules} suggested={suggested} carry={carry} />
      </div>
    </>
  );
}
