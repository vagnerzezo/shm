import type { Metadata } from "next";
import { nowInStudio } from "@/app/_lib/availability";
import { parseItems } from "@/app/_lib/booking";
import { getCurrentUser, keepBarberOut } from "@/app/_lib/auth";
import { getBookingBusy } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { getCatalog } from "@/app/_lib/catalog";
import { isActiveService } from "@/app/_lib/services";
import { BookingHeader } from "@/app/_components/client/booking-header";
import { ServiceList } from "./service-list";

export const metadata: Metadata = {
  title: "Novo agendamento | Studio Heitor Macks",
};

export default async function AgendamentoPage(props: PageProps<"/agendamento">) {
  const { item } = await props.searchParams;
  // Itens já escolhidos, quando o cliente volta para adicionar outro serviço.
  const user = await getCurrentUser();
  keepBarberOut(user);
  const booked = await getBookingBusy(user?.id);
  const catalog = await getCatalog();
  const services = catalog.services.filter(isActiveService);
  const carry = parseItems(item, nowInStudio(), booked, await getAvailabilityRules(), services).map((i) => i.key);

  return (
    <>
      <BookingHeader step={0} />
      <ServiceList services={services} professionals={catalog.professionals} carry={carry} />
    </>
  );
}
