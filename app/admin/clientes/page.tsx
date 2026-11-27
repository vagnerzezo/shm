import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitSelect } from "@/app/_components/auto-submit-select";
import { FilterPanel } from "@/app/_components/filter-panel";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PlusIcon, SearchIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { card, EmptyState, fieldClass, PageTitle, primaryButton, secondaryButton } from "@/app/_components/ui";
import { requireMenu } from "@/app/_lib/auth";
import { addDays, nowInStudio } from "@/app/_lib/availability";
import { initials } from "@/app/_lib/chat-format";
import { getCustomers, type CustomerSummary } from "@/app/_lib/customers";
import { formatPhone, normalize, oneParam as one, shortDate } from "@/app/_lib/format";
import { formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { CustomerRowMenu } from "./customer-row-menu";

export const metadata: Metadata = {
  title: "Clientes | Studio Heitor Macks",
};

const PAGE_SIZE = 25;

const sorts = [
  { id: "nome", label: "Nome (A–Z)" },
  { id: "recentes", label: "Cadastro mais recente" },
  { id: "visita", label: "Última visita" },
  { id: "visitas", label: "Mais visitas" },
] as const;
type Sort = (typeof sorts)[number]["id"];

const filters = [
  { id: "", label: "Todos" },
  { id: "marcado", label: "Com horário" },
  { id: "sumidos", label: "Sem visita 30+ dias" },
  { id: "nunca", label: "Nunca vieram" },
  { id: "faltas", label: "Com faltas" },
  { id: "desativados", label: "Desativados" },
] as const;

function sortCustomers(list: CustomerSummary[], sort: Sort) {
  const byName = (a: CustomerSummary, b: CustomerSummary) => a.name.localeCompare(b.name, "pt-BR");
  return [...list].sort((a, b) => {
    if (sort === "recentes") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "visitas") return b.visits - a.visits || byName(a, b);
    if (sort === "visita") {
      const ka = a.lastVisit ? `${a.lastVisit.date} ${a.lastVisit.time}` : "";
      const kb = b.lastVisit ? `${b.lastVisit.date} ${b.lastVisit.time}` : "";
      return kb.localeCompare(ka) || byName(a, b);
    }
    return byName(a, b);
  });
}

export default async function ClientesPage(props: PageProps<"/admin/clientes">) {
  const { scope } = await requireMenu("clientes", "/admin/clientes");
  const params = await props.searchParams;
  const q = one(params.q).slice(0, 100);
  const sort: Sort = sorts.some((s) => s.id === one(params.ordem)) ? (one(params.ordem) as Sort) : "nome";
  const filter = filters.some((f) => f.id === one(params.filtro)) ? one(params.filtro) : "";

  const now = nowInStudio();
  const monthAgo = addDays(now.date, -30);
  const all = await getCustomers(scope);
  const needle = normalize(q);
  const digits = q.replace(/\D/g, "");

  const rows = sortCustomers(
    all.filter((c) => {
      if (
        needle &&
        !normalize(`${c.name} ${c.email}`).includes(needle) &&
        !(digits.length >= 3 && c.phone.includes(digits))
      ) {
        return false;
      }
      if (filter === "marcado") return Boolean(c.nextBooking);
      if (filter === "sumidos") return !c.nextBooking && Boolean(c.lastVisit) && c.lastVisit!.date < monthAgo;
      if (filter === "nunca") return c.visits === 0;
      if (filter === "desativados") return Boolean(c.disabledAt);
      if (filter === "faltas") return c.missed > 0;
      return true;
    }),
    sort,
  );

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(one(params.pagina)) || 1), pages);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtering = Boolean(q || filter || sort !== "nome");
  const activeFilters = [q, filter].filter(Boolean).length;
  const pageHref = (p: number) =>
    `/admin/clientes?${new URLSearchParams(
      Object.entries({ q, filtro: filter, ordem: sort === "nome" ? "" : sort, pagina: String(p) }).filter(
        ([, v]) => v,
      ),
    )}`;

  const listHref = (patch: Record<string, string>) =>
    `/admin/clientes?${new URLSearchParams(
      Object.entries({ q, filtro: filter, ordem: sort === "nome" ? "" : sort, ...patch }).filter(([, v]) => v),
    )}`;
  const stats = [
    { label: "Clientes", short: "Clientes", value: String(all.length) },
    { label: "Novos em 30 dias", short: "Novos 30 d", value: String(all.filter((c) => c.createdAt.slice(0, 10) >= monthAgo).length) },
    { label: "Com horário marcado", short: "Com horário", value: String(all.filter((c) => c.nextBooking).length) },
    {
      label: "Aceitam e-mail / mensagem",
      short: "E-mail/msg",
      value: `${all.filter((c) => c.consent.email).length} / ${all.filter((c) => c.consent.mensagem).length}`,
    },
  ];
  const chips = (
    <div role="group" aria-label="Mostrar" className="flex flex-wrap gap-1.5">
      {filters.map((f) => {
        const active = f.id === filter;
        return (
          <Link
            key={f.id}
            href={listHref({ filtro: f.id })}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex h-8 items-center rounded-full px-3 text-[13px] font-semibold transition",
              active ? "bg-[#121212] text-white" : "border border-[#e7e5e4] bg-white text-[#3f3f3d] hover:border-[#121212]",
            )}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
  const sortSelect = (
    <label className="shrink-0">
      <span className="sr-only">Ordenar por</span>
      <AutoSubmitSelect name="ordem" defaultValue={sort} className={cn(fieldClass, "h-10 w-auto rounded-[10px] font-semibold")}>
        {sorts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </AutoSubmitSelect>
    </label>
  );
  const search = (
    <label className="relative min-w-[180px] flex-1">
      <span className="sr-only">Buscar cliente</span>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-[#5c5c5a]" />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Nome, e-mail ou telefone"
        className={cn(fieldClass, "h-12 rounded-[14px] pl-10 lg:h-10 lg:rounded-[10px] lg:bg-[#fafaf9]")}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <PanelHeader
        actions={
          <span className="flex gap-2.5 max-lg:hidden">
            {scope.all && all.length > 0 && (
              <a href="/api/admin/exportar/clientes" download className={secondaryButton}>
                <DownloadIcon className="size-[18px]" />
                Exportar CSV
              </a>
            )}
            <Link href="/admin/clientes/novo" className={primaryButton}>
              <PlusIcon className="size-[18px]" />
              Novo cliente
            </Link>
          </span>
        }
      >
        <PageTitle
          title="Clientes"
          description={
            scope.all
              ? "Cadastro, contato e histórico de cada cliente."
              : `Quem você já atendeu (${scope.professional}). Clientes novos aparecem aqui depois do primeiro atendimento.`
          }
        />
      </PanelHeader>

      <section aria-label="Resumo" className={cn(card, "grid grid-cols-4 lg:rounded-[20px]")}>
        {stats.map((st, i) => (
          <div key={st.label} className={cn("min-w-0 px-2.5 py-3 lg:px-[22px] lg:py-4", i > 0 && "border-l border-[#f0efee]")}>
            <p className="truncate text-[11px] font-semibold text-[#5c5c5a] lg:hidden">{st.short}</p>
            <p className="truncate text-[13px] font-semibold text-[#5c5c5a] max-lg:hidden">{st.label}</p>
            <p className="truncate text-xl font-bold lg:mt-0.5 lg:text-[28px]">{st.value}</p>
          </div>
        ))}
      </section>

      {/* Celular: busca + filtros recolhidos. */}
      <div className="lg:hidden">
        <FilterPanel activeCount={activeFilters}>
          <form className="flex flex-col gap-3 pt-1">
            <input type="hidden" name="filtro" value={filter} />
            {search}
            {chips}
            <div className="flex items-center gap-2">
              {sortSelect}
              {filtering && (
                <Link href="/admin/clientes" className="text-sm font-semibold text-[#5c5c5a] underline underline-offset-4">
                  Limpar
                </Link>
              )}
            </div>
          </form>
        </FilterPanel>
        <p className="mt-3 text-[13px] font-semibold text-[#5c5c5a]">
          {filters.find((f) => f.id === filter)?.label} · ordem: {sorts.find((o) => o.id === sort)?.label.toLowerCase()}
        </p>
      </div>

      <section className={cn(card, "overflow-hidden lg:rounded-[20px]")}>
        {/* Computador: busca, filtros e ordem numa barra só. */}
        <form className="flex flex-wrap items-center gap-3 border-b border-[#f0efee] px-4 py-3.5 max-lg:hidden">
          <input type="hidden" name="filtro" value={filter} />
          {search}
          {chips}
          {sortSelect}
        </form>

        {visible.length === 0 ? (
          <div className="p-4">
            <EmptyState>{all.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}</EmptyState>
          </div>
        ) : (
          <>
            {/* Celular: lista. */}
            <ul className="divide-y divide-[#f0efee] lg:hidden">
              {visible.map((c) => (
                <li key={c.id} className="relative flex items-start gap-3 py-3.5 pr-12 pl-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f0efee] text-sm font-bold">
                    {initials(c.name)}
                  </span>
                  <Link href={`/admin/clientes/${c.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{c.name}</span>
                      {c.disabledAt && (
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Desativado</span>
                      )}
                    </span>
                    <span className="truncate text-[13px] text-[#5c5c5a]">
                      {formatPhone(c.phone)} · desde {shortDate(c.createdAt, { year: false })}
                    </span>
                    <span className="truncate text-[13px] text-[#5c5c5a]">
                      {c.visits === 0
                        ? "Nenhuma visita ainda"
                        : `${c.visits} ${c.visits === 1 ? "visita" : "visitas"} · ${formatPrice(c.spentCents)}${c.lastVisit ? ` · última em ${shortDate(c.lastVisit.date, { year: false })}` : ""}`}
                      {c.missed > 0 && <span className="text-[#b91c1c]"> · {c.missed} {c.missed === 1 ? "falta" : "faltas"}</span>}
                    </span>
                    <span className={cn("text-[13px] font-semibold", c.nextBooking ? "text-[#121212]" : "text-[#6b6b69]")}>
                      {c.nextBooking ? `Próximo: ${shortDate(c.nextBooking.date, { year: false })} · ${c.nextBooking.time}` : "Sem horário marcado"}
                    </span>
                  </Link>
                  <span className="absolute top-3 right-2">
                    <CustomerRowMenu id={c.id} name={c.name} canDelete={scope.all} />
                  </span>
                </li>
              ))}
            </ul>

            {/* Computador: tabela (rola dentro do cartão se faltar largura). */}
            <div className="overflow-x-auto max-lg:hidden">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs font-semibold text-[#5c5c5a]">
                  <tr className="border-b border-[#f0efee]">
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Contato</th>
                    <th className="px-4 py-3 font-semibold">Visitas</th>
                    <th className="px-4 py-3 font-semibold">Última visita</th>
                    <th className="px-4 py-3 font-semibold">Próximo horário</th>
                    <th className="w-12 px-4 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0efee]">
                  {visible.map((c) => (
                    <tr key={c.id} className="transition hover:bg-[#fafaf9]">
                      <td className="max-w-[260px] px-4 py-3.5">
                        <Link href={`/admin/clientes/${c.id}`} className="group flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0efee] text-[13px] font-bold">
                            {initials(c.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold underline-offset-4 group-hover:underline">{c.name}</span>
                              {c.disabledAt && (
                                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Desativado</span>
                              )}
                            </span>
                            <span className="block text-[13px] text-[#5c5c5a]">Desde {shortDate(c.createdAt)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-[240px] px-4 py-3.5">
                        <span className="block">{formatPhone(c.phone)}</span>
                        <span className="block truncate text-[13px] text-[#5c5c5a]">{c.email}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block font-semibold">
                          {c.visits} {c.visits === 1 ? "visita" : "visitas"}
                        </span>
                        <span className="block text-[13px] text-[#5c5c5a]">
                          {formatPrice(c.spentCents)}
                          {c.missed > 0 && <span className="text-[#b91c1c]"> · {c.missed} {c.missed === 1 ? "falta" : "faltas"}</span>}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3.5">
                        <span className="block">{c.lastVisit ? shortDate(c.lastVisit.date) : "—"}</span>
                        <span className="block truncate text-[13px] text-[#5c5c5a]">{c.lastVisit?.serviceName ?? "Ainda não veio"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
                            c.nextBooking ? "bg-[#121212] text-white" : "bg-[#f0efee] text-[#44403c]",
                          )}
                        >
                          {c.nextBooking ? `${shortDate(c.nextBooking.date, { year: false })} · ${c.nextBooking.time}` : "Sem horário"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <CustomerRowMenu id={c.id} name={c.name} canDelete={scope.all} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[#f0efee] px-4 py-3.5 text-[13px] text-[#5c5c5a]">
          <p>
            {pages > 1
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, rows.length)} de ${rows.length}`
              : `${rows.length} ${rows.length === 1 ? "cliente" : "clientes"}`}
          </p>
          {pages > 1 && (
            <nav aria-label="Páginas" className="flex gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className={cn(secondaryButton, "h-9 rounded-[10px] px-3")}>
                  <ChevronLeftIcon className="size-4" />
                  Anterior
                </Link>
              )}
              {page < pages && (
                <Link href={pageHref(page + 1)} className={cn(secondaryButton, "h-9 rounded-[10px] px-3")}>
                  Próxima
                  <ChevronRightIcon className="size-4" />
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>

      {/* Celular: ação principal flutuante acima da tab bar. */}
      <Link
        href="/admin/clientes/novo"
        className="fixed right-4 bottom-[calc(65px+env(safe-area-inset-bottom)+16px)] z-30 flex h-14 items-center gap-2 rounded-[18px] bg-[#121212] pr-[22px] pl-[18px] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] lg:hidden"
      >
        <PlusIcon className="size-5" />
        Novo cliente
      </Link>
    </div>
  );
}
