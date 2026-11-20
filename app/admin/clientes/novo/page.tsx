import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle, scrollArea } from "@/app/_components/ui";
import { redirect } from "next/navigation";
import { canOpen } from "@/app/_lib/access";
import { homeOf, requireUser } from "@/app/_lib/auth";
import { oneParam } from "@/app/_lib/format";
import { NewCustomerForm } from "./new-customer-form";

export const metadata: Metadata = {
  title: "Novo cliente | Studio Heitor Macks",
};

export default async function NovoClientePage(props: PageProps<"/admin/clientes/novo">) {
  // Barbeiro cadastra pelo menu Clientes ou pelo "Novo horário" da Agenda.
  const user = await requireUser("/admin/clientes/novo");
  if (!canOpen(user, "clientes") && !canOpen(user, "agenda")) redirect(homeOf(user));
  const back = oneParam((await props.searchParams).voltar) === "reserva" ? "reserva" : "";

  return (
    <>
      <PanelHeader>
        <Link
          href={back ? "/admin/agenda/nova" : "/admin/clientes"}
          className="flex items-center gap-1.5 text-sm font-semibold text-black/70 hover:text-black"
        >
          <ArrowLeftIcon className="size-4" />
          {back ? "Nova reserva" : "Clientes"}
        </Link>
        <div className="mt-3">
          <PageTitle title="Novo cliente" description="Cadastre quem chegou por telefone, WhatsApp ou no balcão." />
        </div>
      </PanelHeader>
      <div className={`mt-6 ${scrollArea}`}>
        <NewCustomerForm back={back} />
      </div>
    </>
  );
}
