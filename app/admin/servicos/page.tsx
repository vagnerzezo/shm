import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { PlusIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { Badge, card, dangerLink, EmptyState, linkButton, PageTitle, primaryButton, scrollArea } from "@/app/_components/ui";
import { colorDot } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { getCatalog } from "@/app/_lib/catalog";
import { deleteService, toggleService } from "@/app/_lib/catalog-actions";
import { readDb } from "@/app/_lib/db";
import { oneParam } from "@/app/_lib/format";
import { categoriesOf, formatDuration, formatPrice, isActiveService } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { ProfessionalsCard } from "./professionals-card";
import { ServiceForm } from "./service-form";

export const metadata: Metadata = {
  title: "Serviços | Studio Heitor Macks",
};

export default async function ServicosPage(props: PageProps<"/admin/servicos">) {
  await requireAdmin("/admin/servicos");
  const params = await props.searchParams;
  const editId = oneParam(params.editar);
  const creating = oneParam(params.novo) === "1";

  const { services, professionals } = await getCatalog();
  const { reservations } = await readDb();
  const used = new Map<string, number>();
  for (const r of reservations) used.set(r.serviceId, (used.get(r.serviceId) ?? 0) + 1);
  const editing = services.find((s) => s.id === editId);
  const categories = categoriesOf(services);

  return (
    <>
      <PanelHeader>
        <PageTitle title="Serviços" description="O que o estúdio oferece, com preço, duração e quem atende." />
      </PanelHeader>

      <div className={cn("mt-7 flex flex-col gap-5", scrollArea)}>
        {(creating || editing) && (
          <ServiceForm
            key={editing?.id ?? "novo"}
            service={editing}
            professionals={professionals.map((p) => p.name)}
            categories={categories}
          />
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <h2 className="text-lg font-bold text-black">Catálogo</h2>
              <p className="text-sm text-black/70">
                {services.filter(isActiveService).length} ativos de {services.length}. Serviços inativos não aparecem
                para o cliente marcar.
              </p>
            </div>
            {!creating && !editing && (
              <Link href="/admin/servicos?novo=1" className={primaryButton}>
                <PlusIcon className="size-4" />
                Novo serviço
              </Link>
            )}
          </div>

          {services.length === 0 ? (
            <EmptyState>Nenhum serviço cadastrado.</EmptyState>
          ) : (
            categories.map((category) => (
              <div key={category} className={cn(card, "overflow-hidden")}>
                <h3 className="border-b border-black/10 px-4 py-2.5 text-xs font-semibold tracking-widest text-black/60 uppercase">
                  {category}
                </h3>
                <ul className="divide-y divide-black/10">
                  {services
                    .filter((s) => s.category === category)
                    .map((s) => {
                      const count = used.get(s.id) ?? 0;
                      const active = isActiveService(s);
                      return (
                        <li key={s.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", !active && "opacity-60")}>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-black">{s.name}</p>
                              {!active && <Badge>Inativo</Badge>}
                            </div>
                            <p className="text-sm text-black/60">
                              {formatDuration(s.durationMinutes)} · {s.professional ?? "Qualquer profissional"} ·{" "}
                              {count} {count === 1 ? "reserva" : "reservas"}
                            </p>
                          </div>
                          <p className="font-bold text-black">{formatPrice(s.priceCents)}</p>
                          <div className="flex items-center gap-4">
                            <Link href={`/admin/servicos?editar=${s.id}`} className={linkButton}>
                              Editar
                            </Link>
                            <form action={toggleService}>
                              <input type="hidden" name="id" value={s.id} />
                              <button className={linkButton}>{active ? "Desativar" : "Ativar"}</button>
                            </form>
                            {count === 0 && (
                              <ConfirmButton
                                action={deleteService}
                                fields={{ id: s.id }}
                                title={`Excluir “${s.name}”?`}
                                description="O serviço sai do catálogo de vez. Nenhuma reserva usa este serviço."
                                confirmLabel="Excluir serviço"
                                successMessage="Serviço excluído."
                                className={dangerLink}
                              >
                                Excluir
                              </ConfirmButton>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))
          )}
          <p className="text-xs text-black/50">
            Serviços com reservas não podem ser excluídos, só desativados: o histórico e o faturamento dependem deles.
            Mudar o preço vale para novas reservas; as já feitas mantêm o valor de quando foram marcadas.
          </p>
        </section>

        <ProfessionalsCard
          professionals={professionals.map((p) => ({
            ...p,
            dot: colorDot(p.color),
            services: services.filter((s) => s.professional === p.name).length,
          }))}
        />
      </div>
    </>
  );
}
