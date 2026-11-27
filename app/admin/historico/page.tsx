import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitSelect } from "@/app/_components/auto-submit-select";
import { FilterPanel } from "@/app/_components/filter-panel";
import { ChatIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, SearchIcon, XIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { Badge, card, EmptyState, fieldClass, labelClass, PageTitle, primaryButton, secondaryButton } from "@/app/_components/ui";
import { getCatalog } from "@/app/_lib/catalog";
import { agendaHref } from "@/app/_lib/agenda";
import { requireMenu } from "@/app/_lib/auth";
import { formatShortMonth, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { formatPhone } from "@/app/_lib/format";
import {
  filterHistory,
  historyHref,
  NO_PROFESSIONAL,
  PAGE_SIZE,
  parseFilters,
  statuses,
  summarize,
} from "@/app/_lib/history";
import { getAgenda, professionalOf, statusOf, type ReservationStatus } from "@/app/_lib/reservations";
import { formatPrice, PROFESSIONAL_DOT } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Histórico | Studio Heitor Macks",
};

function StatusBadge({ status }: { status: ReservationStatus }) {
  if (status === "agendado") return <Badge tone="dark">Agendado</Badge>;
  if (status === "faltou") return <Badge tone="red">Faltou</Badge>;
  if (status === "cancelada") return <Badge tone="outline">Cancelada</Badge>;
  return <Badge>Realizado</Badge>;
}

export default async function HistoricoPage(props: PageProps<"/admin/historico">) {
  const { scope } = await requireMenu("historico", "/admin/historico");
  const filters = parseFilters(await props.searchParams);
  const now = nowInStudio();

  const all = await getAgenda(undefined, undefined, { includeCancelled: true, scope });
  const { professionals } = await getCatalog();
  const rows = filterHistory(all, filters, now);
  const stats = summarize(rows, now);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(filters.pagina, pages);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const customer = filters.cliente ? all.find((r) => r.customer.id === filters.cliente)?.customer : undefined;
  const activeFilters = [filters.q, filters.profissional, filters.situacao, filters.de, filters.ate].filter(Boolean).length;
  const filtering = Boolean(activeFilters || filters.cliente);
  // Mesmos filtros da tela, para o CSV sair igual ao que está na lista.
  const exportHref = `/api/admin/exportar/historico?${historyHref(filters).split("?")[1] ?? ""}`;

  const missedPct = stats.done + stats.missed > 0 ? Math.round((stats.missed / (stats.done + stats.missed)) * 100) : 0;
  const counters = [
    { label: "Horários", value: String(stats.total) },
    { label: "Clientes", value: String(stats.customers) },
    { label: "Realizados", value: String(stats.done) },
    { label: "Faltas", value: String(stats.missed), extra: ` · ${missedPct}%` },
  ];
  const dotOf = (name: string | null) => {
    const color = professionals.find((p) => p.name === name)?.color;
    return color ? PROFESSIONAL_DOT[color] : "bg-[#78716c]";
  };
  const struck = (status: ReservationStatus) => status === "faltou" || status === "cancelada";

  const fields = (
    <>
      {filters.cliente && <input type="hidden" name="cliente" value={filters.cliente} />}
      <label className="relative min-w-[200px] flex-1">
        <span className="sr-only">Buscar</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-[#5c5c5a]" />
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Cliente, telefone ou serviço"
          className={cn(fieldClass, "h-12 rounded-[14px] pl-10 lg:h-10 lg:rounded-[10px] lg:bg-[#fafaf9]")}
        />
      </label>
      {scope.all && (
        <label className="shrink-0">
          <span className="sr-only">Profissional</span>
          <AutoSubmitSelect name="profissional" defaultValue={filters.profissional} className={cn(fieldClass, "h-10 rounded-[10px] font-semibold lg:w-auto")}>
            <option value="">Todos os profissionais</option>
            {professionals.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
            <option value={NO_PROFESSIONAL}>Sem profissional fixo</option>
          </AutoSubmitSelect>
        </label>
      )}
      <label className="shrink-0">
        <span className="sr-only">Situação</span>
        <AutoSubmitSelect name="situacao" defaultValue={filters.situacao} className={cn(fieldClass, "h-10 rounded-[10px] font-semibold lg:w-auto")}>
          <option value="">Todas as situações</option>
          {statuses.map((st) => (
            <option key={st.id} value={st.id}>
              {st.label}
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <label className="flex shrink-0 items-center gap-2">
        <span className={labelClass}>De</span>
        <input type="date" name="de" defaultValue={filters.de} className={cn(fieldClass, "h-10 w-auto rounded-[10px]")} />
      </label>
      <label className="flex shrink-0 items-center gap-2">
        <span className={labelClass}>Até</span>
        <input type="date" name="ate" defaultValue={filters.ate} className={cn(fieldClass, "h-10 w-auto rounded-[10px]")} />
      </label>
      <span className="flex shrink-0 gap-2">
        <button type="submit" className={cn(primaryButton, "h-10 rounded-[10px]")}>
          Filtrar
        </button>
        {filtering && (
          <Link href="/admin/historico" className={cn(secondaryButton, "h-10 rounded-[10px]")}>
            Limpar
          </Link>
        )}
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <PanelHeader
        actions={
          scope.all &&
          rows.length > 0 && (
            <a href={exportHref} className={cn(secondaryButton, "max-lg:hidden")} download>
              <DownloadIcon className="size-[18px]" />
              Exportar CSV
            </a>
          )
        }
      >
        <PageTitle
          title="Histórico"
          description={
            scope.all ? "Todos os horários marcados, com situação e valor." : `Seus horários (${scope.professional}), com situação e valor.`
          }
        />
      </PanelHeader>

      {/* Números: celular com Faturado em destaque; computador numa faixa de 5. */}
      <section aria-label="Resumo" className={cn(card, "overflow-hidden lg:grid lg:grid-cols-5 lg:rounded-[20px]")}>
        <div className="flex items-end justify-between gap-3 bg-[#121212] px-4 py-3.5 text-white lg:block lg:bg-transparent lg:px-[22px] lg:py-4 lg:text-[#121212]">
          <span>
            <span className="block text-xs font-semibold text-white/70 lg:text-[13px] lg:text-[#5c5c5a]">
              Faturado<span className="max-lg:hidden"> · sem as faltas</span>
            </span>
            <span className="block text-2xl font-bold lg:mt-0.5 lg:truncate lg:text-[28px]">{formatPrice(stats.revenueCents)}</span>
          </span>
          <span className="text-xs text-white/70 lg:hidden">sem as faltas</span>
        </div>
        <div className="grid grid-cols-4 lg:contents">
          {counters.map((c, i) => (
            <div key={c.label} className={cn("min-w-0 px-2.5 py-3 lg:border-l lg:border-[#f0efee] lg:px-[22px] lg:py-4", i > 0 && "border-l border-[#f0efee]")}>
              <p className="truncate text-[11px] font-semibold text-[#5c5c5a] lg:text-[13px]">
                {c.label}
                {c.extra && <span className="lg:hidden">{c.extra}</span>}
              </p>
              <p className="truncate text-xl font-bold lg:mt-0.5 lg:text-[28px]">
                {c.value}
                {c.extra && <span className="text-base font-semibold text-[#5c5c5a] max-lg:hidden">{c.extra}</span>}
              </p>
            </div>
          ))}
        </div>
      </section>
      {stats.cancelled > 0 && (
        <p className="-mt-2 text-xs text-[#6b6b69]">
          {stats.cancelled} {stats.cancelled === 1 ? "cancelado fica" : "cancelados ficam"} fora da conta.
        </p>
      )}

      {/* Celular: busca e filtros recolhidos. GET: tudo fica na URL. */}
      <div className="lg:hidden">
        <FilterPanel activeCount={activeFilters}>
          <form className="flex flex-col gap-3 pt-1 [&>label]:w-full">{fields}</form>
        </FilterPanel>
      </div>

      {filters.cliente && (
        <div className={cn(card, "flex flex-wrap items-center gap-3 px-4 py-3")}>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.6px] text-[#5c5c5a] uppercase">Cliente</p>
            <p className="font-semibold">{customer?.name ?? "Cliente sem reservas"}</p>
            {customer && (
              <p className="text-sm text-[#5c5c5a]">
                {formatPhone(customer.phone)} · {customer.email}
              </p>
            )}
          </div>
          <Link href={`/admin/chat?cliente=${filters.cliente}`} className={cn(primaryButton, "h-9 rounded-[10px] px-3")}>
            <ChatIcon className="size-4" />
            Conversar
          </Link>
          <Link
            href={historyHref(filters, { cliente: "" })}
            aria-label="Ver todos os clientes"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e7e5e4] bg-white transition hover:border-[#121212]"
          >
            <XIcon className="size-4" />
          </Link>
        </div>
      )}

      <p className="text-[13px] font-semibold text-[#5c5c5a] lg:hidden">
        {rows.length} {rows.length === 1 ? "horário" : "horários"}
      </p>

      <section className={cn(card, "overflow-hidden lg:rounded-[20px]")}>
        <form className="flex flex-wrap items-center gap-2.5 border-b border-[#f0efee] px-4 py-3.5 max-lg:hidden">{fields}</form>

        {visible.length === 0 ? (
          <div className="p-4">
            <EmptyState>{filtering ? "Nenhum horário encontrado com esses filtros." : "Nenhum horário marcado ainda."}</EmptyState>
          </div>
        ) : (
          <>
            {/* Celular: lista. */}
            <ul className="divide-y divide-[#f0efee] lg:hidden">
              {visible.map((r) => {
                const status = statusOf(r, now);
                return (
                  <li key={r.id}>
                    <Link href={agendaHref("dia", r.date, r.id)} className="flex items-start gap-3 px-4 py-3.5">
                      <span className="w-[52px] shrink-0 rounded-xl bg-[#f5f5f4] py-1.5 text-center">
                        <span className="block text-[11px] font-bold text-[#5c5c5a] uppercase">{formatWeekday(r.date).slice(0, 3)}</span>
                        <span className="block text-xl leading-tight font-bold">{Number(r.date.slice(8))}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[15px] font-semibold">{r.customer.name}</span>
                          <StatusBadge status={status} />
                        </span>
                        <span className="truncate text-[13px] text-[#5c5c5a]">
                          {r.time} – {endTime(r.time, r.service.durationMinutes)} · {r.service.name}
                        </span>
                        <span className={cn("text-sm font-bold", struck(status) && "text-[#a8a29e] line-through")}>
                          {formatPrice(r.service.priceCents)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Computador: tabela. */}
            <div className="overflow-x-auto max-lg:hidden">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs text-[#5c5c5a]">
                  <tr className="border-b border-[#f0efee]">
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Serviço</th>
                    {scope.all && <th className="px-4 py-3 font-semibold">Profissional</th>}
                    <th className="px-4 py-3 font-semibold">Valor</th>
                    <th className="px-4 py-3 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0efee]">
                  {visible.map((r) => {
                    const status = statusOf(r, now);
                    const pro = professionalOf(r, r.service);
                    return (
                      <tr key={r.id} className="transition hover:bg-[#fafaf9]">
                        <td className="px-4 py-3">
                          <Link href={agendaHref("dia", r.date, r.id)} className="flex items-center gap-3">
                            <span className="w-11 shrink-0 rounded-[10px] bg-[#f5f5f4] py-1 text-center">
                              <span className="block text-[10px] font-bold text-[#5c5c5a]">{formatShortMonth(r.date)}</span>
                              <span className="block text-base leading-tight font-bold">{Number(r.date.slice(8))}</span>
                            </span>
                            <span>
                              <span className="block font-semibold capitalize">{formatWeekday(r.date).split("-")[0]}</span>
                              <span className="block text-[13px] text-[#5c5c5a]">
                                {r.time} – {endTime(r.time, r.service.durationMinutes)}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <Link href={historyHref(filters, { cliente: r.customer.id })} className="block truncate font-semibold underline-offset-4 hover:underline">
                            {r.customer.name}
                          </Link>
                          <span className="block text-[13px] text-[#5c5c5a]">{formatPhone(r.customer.phone)}</span>
                        </td>
                        <td className="max-w-[260px] px-4 py-3">
                          <span className="block truncate">{r.service.name}</span>
                          {r.note && <span className="block truncate text-[13px] text-[#5c5c5a] italic">“{r.note}”</span>}
                        </td>
                        {scope.all && (
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className={cn("size-2 rounded-full", dotOf(pro))} />
                              {pro ?? "Sem profissional"}
                            </span>
                          </td>
                        )}
                        <td className={cn("px-4 py-3 font-semibold whitespace-nowrap", struck(status) && "text-[#a8a29e] line-through")}>
                          {formatPrice(r.service.priceCents)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[#f0efee] px-4 py-3.5 text-[13px] text-[#5c5c5a]">
          <p>
            {pages > 1
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, rows.length)} de ${rows.length}`
              : `${rows.length} ${rows.length === 1 ? "horário" : "horários"}`}
          </p>
          {pages > 1 && (
            <nav aria-label="Páginas" className="flex gap-2">
              {page > 1 && (
                <Link href={historyHref(filters, { pagina: page - 1 })} className={cn(secondaryButton, "h-9 rounded-[10px] px-3")}>
                  <ChevronLeftIcon className="size-4" />
                  Anterior
                </Link>
              )}
              {page < pages && (
                <Link href={historyHref(filters, { pagina: page + 1 })} className={cn(secondaryButton, "h-9 rounded-[10px] px-3")}>
                  Próxima
                  <ChevronRightIcon className="size-4" />
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
