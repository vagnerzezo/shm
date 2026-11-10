import type { Metadata } from "next";
import { nowInStudio } from "@/app/_lib/availability";
import { parseItems } from "@/app/_lib/booking";
import { getCurrentUser } from "@/app/_lib/auth";
import { getBookingBusy } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { getBookableServices } from "@/app/_lib/catalog";
import { PanelHeader } from "@/app/_components/panel-header";
import { ServiceList } from "./service-list";

export const metadata: Metadata = {
  title: "Novo agendamento | Studio Heitor Macks",
};

export default async function AgendamentoPage(props: PageProps<"/agendamento">) {
  const { item } = await props.searchParams;
  // Itens já escolhidos, quando o cliente volta para adicionar outro serviço.
  const user = await getCurrentUser();
  const booked = await getBookingBusy(user?.id);
  const services = await getBookableServices();
  const carry = parseItems(item, nowInStudio(), booked, await getAvailabilityRules(), services).map((i) => i.key);

  return (
    <>
      <PanelHeader step={0}>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-black sm:text-4xl">
          Escolha um serviço
        </h1>
      </PanelHeader>

      <div className="mt-7 flex min-h-0 flex-1 flex-col">
        <ServiceList services={services} carry={carry} />
      </div>
    </>
  );
}
