import type { Metadata } from "next";
import Link from "next/link";
import { FilterPanel } from "@/app/_components/filter-panel";
import { ChatIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, SearchIcon, XIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { Badge, card, EmptyState, fieldClass, labelClass, PageTitle, primaryButton, scrollArea, secondaryButton, Stat } from "@/app/_components/ui";
import { getCatalog } from "@/app/_lib/catalog";
import { agendaHref } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { formatLongDate, formatWeekday, nowInStudio } from "@/app/_lib/availability";
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
import { getAgenda, statusOf, type ReservationStatus } from "@/app/_lib/reservations";
import { formatPrice } from "@/app/_lib/services";
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
  await requireAdmin("/admin/historico");
  const filters = parseFilters(await props.searchParams);
  const now = nowInStudio();

  const all = await getAgenda(undefined, undefined, { includeCancelled: true });
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

  return (
    <>
      <PanelHeader>
        <PageTitle title="Histórico" description="Todos os horários marcados, com situação e valor." />
      </PanelHeader>

      <div className={`mt-7 ${scrollArea}`}>
        <FilterPanel activeCount={activeFilters}>
        {/* GET: os filtros ficam na URL e funcionam sem JavaScript. */}
        <form className={cn(card, "grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end")}>
          {filters.cliente && <input type="hidden" name="cliente" value={filters.cliente} />}
          <label className="sm:col-span-2 lg:col-span-1">
            <span className={labelClass}>Buscar</span>
            <span className="relative mt-1.5 block">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/50" />
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder="Cliente, telefone ou serviço"
                className={cn(fieldClass, "pl-9")}
              />
            </span>
          </label>
          <label>
            <span className={labelClass}>Profissional</span>
            <select name="profissional" defaultValue={filters.profissional} className={cn(fieldClass, "mt-1.5")}>
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value={NO_PROFESSIONAL}>Sem profissional fixo</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>Situação</span>
            <select name="situacao" defaultValue={filters.situacao} className={cn(fieldClass, "mt-1.5")}>
              <option value="">Todas</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>De</span>
            <input type="date" name="de" defaultValue={filters.de} className={cn(fieldClass, "mt-1.5")} />
          </label>
          <label>
            <span className={labelClass}>Até</span>
            <input type="date" name="ate" defaultValue={filters.ate} className={cn(fieldClass, "mt-1.5")} />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button type="submit" className={cn(primaryButton, "flex-1")}>
              Filtrar
            </button>
            {filtering && (
              <Link href="/admin/historico" className={secondaryButton}>
                Limpar
              </Link>
            )}
          </div>
        </form>
        </FilterPanel>

        {filters.cliente && (
          <div className={cn(card, "mt-4 flex flex-wrap items-center gap-3 px-4 py-3")}>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-widest text-black/60">CLIENTE</p>
              <p className="font-semibold text-black">{customer?.name ?? "Cliente sem reservas"}</p>
              {customer && (
                <p className="text-sm text-black/70">
                  {formatPhone(customer.phone)} · {customer.email}
                </p>
              )}
            </div>
            <Link
              href={`/admin/chat?cliente=${filters.cliente}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#121212] px-3 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              <ChatIcon className="size-4" />
              Conversar
            </Link>
            <Link
              href={historyHref(filters, { cliente: "" })}
              aria-label="Ver todos os clientes"
              className="grid size-9 place-items-center rounded-lg border border-black/20 bg-white text-black transition hover:bg-black/5"
            >
              <XIcon className="size-4" />
            </Link>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="HORÁRIOS" value={String(stats.total)} hint={stats.cancelled > 0 ? `${stats.cancelled} ${stats.cancelled === 1 ? "cancelado" : "cancelados"} fora da conta` : undefined} />
          <Stat label="CLIENTES" value={String(stats.customers)} />
          <Stat label="REALIZADOS" value={String(stats.done)} />
          <Stat label="FALTAS" value={String(stats.missed)} hint={stats.done + stats.missed > 0 ? `${Math.round((stats.missed / (stats.done + stats.missed)) * 100)}% dos atendimentos passados` : undefined} />
          <Stat label="FATURADO" value={formatPrice(stats.revenueCents)} hint="Sem as faltas" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-black/60">
            {rows.length} {rows.length === 1 ? "horário" : "horários"}
          </p>
          {rows.length > 0 && (
            <a href={exportHref} className={cn(secondaryButton, "h-9")} download>
              <DownloadIcon className="size-4" />
              Exportar CSV
            </a>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="mt-3">
            <EmptyState>
              {filtering ? "Nenhum horário encontrado com esses filtros." : "Nenhum horário marcado ainda."}
            </EmptyState>
          </div>
        ) : (
          <div className={cn(card, "mt-3 overflow-hidden")}>
            <table className="w-full text-left text-sm">
              <thead className="hidden border-b border-black/10 text-xs font-semibold tracking-widest text-black/60 md:table-header-group">
                <tr>
                  <th className="px-4 py-3">DATA</th>
                  <th className="px-4 py-3">CLIENTE</th>
                  <th className="px-4 py-3">SERVIÇO</th>
                  <th className="px-4 py-3">VALOR</th>
                  <th className="px-4 py-3">SITUAÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {visible.map((r) => {
                  const status = statusOf(r, now);
                  return (
                    // No mobile cada linha vira um cartão empilhado.
                    <tr key={r.id} className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 md:table-row md:p-0">
                      <td className="col-span-2 md:px-4 md:py-3">
                        <Link
                          href={agendaHref("dia", r.date, r.id)}
                          className="font-semibold text-black underline-offset-4 hover:underline"
                        >
                          {formatLongDate(r.date)}
                        </Link>
                        <span className="block text-black/60">
                          {formatWeekday(r.date)} · {r.time} – {endTime(r.time, r.service.durationMinutes)}
                        </span>
                      </td>
                      <td className="col-span-2 md:px-4 md:py-3">
                        <Link
                          href={historyHref(filters, { cliente: r.customer.id })}
                          className="font-semibold text-black underline-offset-4 hover:underline"
                        >
                          {r.customer.name}
                        </Link>
                        <span className="block text-black/60">{formatPhone(r.customer.phone)}</span>
                      </td>
                      <td className="col-span-2 md:px-4 md:py-3">
                        <span className="text-black">{r.service.name}</span>
                        {r.note && <span className="block italic text-black/60">“{r.note}”</span>}
                      </td>
                      <td className={cn("font-semibold text-black md:px-4 md:py-3", (status === "faltou" || status === "cancelada") && "text-black/40 line-through")}>
                        {formatPrice(r.service.priceCents)}
                      </td>
                      <td className="text-right md:px-4 md:py-3 md:text-left">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-3 text-sm">
            <p className="text-black/70">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} de {rows.length}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={historyHref(filters, { pagina: page - 1 })}
                  className="inline-flex h-10 items-center gap-1 rounded-lg border border-black/20 bg-white px-3 font-semibold text-black hover:bg-black/5"
                >
                  <ChevronLeftIcon className="size-4" />
                  Anterior
                </Link>
              )}
              {page < pages && (
                <Link
                  href={historyHref(filters, { pagina: page + 1 })}
                  className="inline-flex h-10 items-center gap-1 rounded-lg border border-black/20 bg-white px-3 font-semibold text-black hover:bg-black/5"
                >
                  Próxima
                  <ChevronRightIcon className="size-4" />
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
