import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle, scrollArea } from "@/app/_components/ui";
import { agendaHref, parseDate, scheduleTimes } from "@/app/_lib/agenda";
import { requireMenu } from "@/app/_lib/auth";
import { nowInStudio } from "@/app/_lib/availability";
import { getCatalog } from "@/app/_lib/catalog";
import { getCustomerPicklist, getCustomers } from "@/app/_lib/customers";
import { oneParam } from "@/app/_lib/format";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { isActiveService } from "@/app/_lib/services";
import { NewReservationForm } from "./new-reservation-form";

export const metadata: Metadata = {
  title: "Nova reserva | Studio Heitor Macks",
};

export default async function NovaReservaPage(props: PageProps<"/admin/agenda/nova">) {
  const { scope } = await requireMenu("agenda", "/admin/agenda/nova");
  const params = await props.searchParams;
  const now = nowInStudio();
  const date = parseDate(params.data, now.date);
  const [customers, catalog, rules] = await Promise.all([
    // Barbeiro marca para qualquer cliente, mas vê só nome e telefone na busca.
    scope.all
      ? getCustomers().then((all) =>
          all.filter((c) => !c.disabledAt).map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email })),
        )
      : getCustomerPicklist(),
    getCatalog(),
    getAvailabilityRules(),
  ]);
  // Barbeiro: só os serviços que ele atende (fixos dele ou sem profissional fixo).
  const services = catalog.services.filter(
    (s) => isActiveService(s) && (scope.all || !s.professional || s.professional === scope.professional),
  );

  return (
    <>
      <PanelHeader>
        <Link
          href={agendaHref("dia", date)}
          className="flex items-center gap-1.5 text-sm font-semibold text-black/70 hover:text-black"
        >
          <ArrowLeftIcon className="size-4" />
          Agenda
        </Link>
        <div className="mt-3">
          <PageTitle
            title="Nova reserva"
            description="Para quem ligou, mandou mensagem ou chegou sem marcar."
          />
        </div>
      </PanelHeader>

      <div className={`mt-6 ${scrollArea}`}>
        <NewReservationForm
          customers={customers}
          services={services}
          date={date}
          today={now.date}
          times={scheduleTimes(rules.settings)}
          customerId={oneParam(params.cliente)}
        />
      </div>
    </>
  );
}
