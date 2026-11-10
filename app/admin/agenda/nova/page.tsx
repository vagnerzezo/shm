import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle, scrollArea } from "@/app/_components/ui";
import { agendaHref, parseDate, scheduleTimes } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { nowInStudio } from "@/app/_lib/availability";
import { getCatalog } from "@/app/_lib/catalog";
import { getCustomers } from "@/app/_lib/customers";
import { oneParam } from "@/app/_lib/format";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { isActiveService } from "@/app/_lib/services";
import { NewReservationForm } from "./new-reservation-form";

export const metadata: Metadata = {
  title: "Nova reserva | Studio Heitor Macks",
};

export default async function NovaReservaPage(props: PageProps<"/admin/agenda/nova">) {
  await requireAdmin("/admin/agenda/nova");
  const params = await props.searchParams;
  const now = nowInStudio();
  const date = parseDate(params.data, now.date);
  const [customers, catalog, rules] = await Promise.all([getCustomers(), getCatalog(), getAvailabilityRules()]);

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
          customers={customers
            .filter((c) => !c.disabledAt)
            .map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))}
          services={catalog.services.filter(isActiveService)}
          date={date}
          today={now.date}
          times={scheduleTimes(rules.settings)}
          customerId={oneParam(params.cliente)}
        />
      </div>
    </>
  );
}
