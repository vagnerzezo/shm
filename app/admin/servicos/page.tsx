import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { Badge, card, EmptyState, PageTitle, primaryButton, secondaryButton } from "@/app/_components/ui";
import { requireAdmin } from "@/app/_lib/auth";
import { getCatalog } from "@/app/_lib/catalog";
import { readDb } from "@/app/_lib/db";
import { oneParam } from "@/app/_lib/format";
import {
  categoriesOf,
  formatDuration,
  formatPrice,
  isActiveService,
  PROFESSIONAL_DOT,
  professionalColorOf,
} from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { ServiceForm } from "./service-form";
import { ServiceRowMenu } from "./service-row-menu";

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
  const activeCount = services.filter(isActiveService).length;

  return (
    <>
      <PanelHeader
        actions={
          !creating &&
          !editing && (
            <Link href="/admin/servicos?novo=1" className={cn(primaryButton, "max-lg:hidden")}>
              <PlusIcon className="size-4" />
              Novo serviço
            </Link>
          )
        }
      >
        <PageTitle
          title="Serviços"
          description={`${activeCount} ${activeCount === 1 ? "ativo" : "ativos"} de ${services.length} · preço, duração e quem atende. Inativos não aparecem para o cliente marcar.`}
        />
      </PanelHeader>

      <div className="mt-5 flex flex-col gap-4">
        {(creating || editing) && (
          <ServiceForm
            key={editing?.id ?? "novo"}
            service={editing}
            professionals={professionals.map((p) => p.name)}
            categories={categories}
          />
        )}

        {services.length === 0 ? (
          <EmptyState>Nenhum serviço cadastrado.</EmptyState>
        ) : (
          <section aria-label="Catálogo" className={cn(card, "overflow-hidden lg:rounded-[20px]")}>
            {categories.map((category) => (
              <div key={category}>
                <h2 className="border-b border-[#f0efee] bg-[#fafaf9] px-4 py-3 text-xs font-bold tracking-[0.8px] text-[#5c5c5a] uppercase lg:px-[22px]">
                  {category}
                </h2>
                <ul>
                  {services
                    .filter((s) => s.category === category)
                    .map((s) => {
                      const count = used.get(s.id) ?? 0;
                      const active = isActiveService(s);
                      const color = professionalColorOf(s, professionals);
                      return (
                        <li
                          key={s.id}
                          // Celular: nome e preço em cima; profissional e ações embaixo. Computador: uma linha.
                          className={cn(
                            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-[#f0efee] py-3 pr-3 pl-4 last:border-b-0",
                            "lg:min-h-[58px] lg:grid-cols-[minmax(0,1fr)_160px_110px_92px_36px] lg:py-2 lg:pl-[22px]",
                            editing?.id === s.id && "bg-[#fafaf9]",
                          )}
                        >
                          <div className={cn("min-w-0", !active && "opacity-60")}>
                            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                              <span className="min-w-0 break-words">{s.name}</span>
                              {!active && <Badge>Inativo</Badge>}
                            </p>
                            <p className="text-[13px] text-[#5c5c5a]">
                              {formatDuration(s.durationMinutes)} ·{" "}
                              {count === 0 ? "sem reservas" : `${count} ${count === 1 ? "reserva" : "reservas"}`}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "flex min-w-0 items-center gap-1.5 text-[13px] text-[#3f3f3d] max-lg:order-3",
                              !active && "opacity-60",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn("size-2 shrink-0 rounded-full", color ? PROFESSIONAL_DOT[color] : "bg-[#78716c]")}
                            />
                            <span className="truncate">{s.professional ?? "Qualquer profissional"}</span>
                          </p>
                          <p
                            className={cn(
                              "text-right text-[15px] font-bold max-lg:order-2 max-lg:self-start",
                              !active && "opacity-60",
                            )}
                          >
                            {formatPrice(s.priceCents)}
                          </p>
                          {/* Celular: Editar e ⋮ juntos à direita, na linha do profissional. */}
                          <div className="flex items-center justify-end gap-1 max-lg:order-4 lg:contents">
                            <Link
                              href={`/admin/servicos?editar=${s.id}`}
                              aria-label={`Editar ${s.name}`}
                              className={cn(secondaryButton, "h-9 rounded-[10px] px-3.5 text-[13px] lg:px-0")}
                            >
                              Editar
                            </Link>
                            <ServiceRowMenu id={s.id} name={s.name} active={active} canDelete={count === 0} />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </section>
        )}
        {/* Celular: espaço para o botão flutuante não cobrir o aviso. */}
        <p className="text-[13px] text-[#5c5c5a] max-lg:pb-20">
          Serviços com reservas só podem ser desativados (o histórico e o faturamento dependem deles). Mudar o preço vale
          só para reservas novas.
        </p>
      </div>

      {/* Celular: ação principal flutuante acima da tab bar. */}
      {!creating && !editing && (
        <Link
          href="/admin/servicos?novo=1"
          className="fixed right-4 bottom-[calc(65px+env(safe-area-inset-bottom)+16px)] z-30 flex h-14 items-center gap-2 rounded-[18px] bg-[#121212] pr-[22px] pl-[18px] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] lg:hidden"
        >
          <PlusIcon className="size-5" />
          Novo serviço
        </Link>
      )}
    </>
  );
}
