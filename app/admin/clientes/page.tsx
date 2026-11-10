import type { Metadata } from "next";
import Link from "next/link";
import { FilterPanel } from "@/app/_components/filter-panel";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PlusIcon, SearchIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { card, EmptyState, fieldClass, labelClass, PageTitle, primaryButton, scrollArea, secondaryButton, Stat } from "@/app/_components/ui";
import { requireAdmin } from "@/app/_lib/auth";
import { addDays, nowInStudio } from "@/app/_lib/availability";
import { initials } from "@/app/_lib/chat-format";
import { getCustomers, type CustomerSummary } from "@/app/_lib/customers";
import { formatPhone, normalize, oneParam as one, shortDate } from "@/app/_lib/format";
import { formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

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
  { id: "marcado", label: "Com horário marcado" },
  { id: "sumidos", label: "Sem visita há 30+ dias" },
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
  await requireAdmin("/admin/clientes");
  const params = await props.searchParams;
  const q = one(params.q).slice(0, 100);
  const sort: Sort = sorts.some((s) => s.id === one(params.ordem)) ? (one(params.ordem) as Sort) : "nome";
  const filter = filters.some((f) => f.id === one(params.filtro)) ? one(params.filtro) : "";

  const now = nowInStudio();
  const monthAgo = addDays(now.date, -30);
  const all = await getCustomers();
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

  return (
    <>
      <PanelHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <PageTitle title="Clientes" description="Cadastro, contato e histórico de cada cliente." />
          </div>
          <div className="flex flex-wrap gap-2">
            {all.length > 0 && (
              <a href="/api/admin/exportar/clientes" download className={cn(secondaryButton, "h-10")}>
                <DownloadIcon className="size-4" />
                <span className="hidden sm:inline">Exportar CSV</span>
                <span className="sm:hidden">CSV</span>
              </a>
            )}
            <Link href="/admin/clientes/novo" className={cn(primaryButton, "h-10")}>
              <PlusIcon className="size-4" />
              Novo cliente
            </Link>
          </div>
        </div>
      </PanelHeader>

      <div className={`mt-7 ${scrollArea}`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="CLIENTES" value={String(all.length)} />
          <Stat
            label="NOVOS EM 30 DIAS"
            value={String(all.filter((c) => c.createdAt.slice(0, 10) >= monthAgo).length)}
          />
          <Stat label="COM HORÁRIO MARCADO" value={String(all.filter((c) => c.nextBooking).length)} />
          <Stat
            label="ACEITAM E-MAIL / MSG"
            value={`${all.filter((c) => c.consent.email).length} / ${all.filter((c) => c.consent.mensagem).length}`}
          />
        </div>

        <div className="mt-4">
        <FilterPanel activeCount={activeFilters}>
        <form className={cn(card, "grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end")}>
          <label className="sm:col-span-2 lg:col-span-1">
            <span className={labelClass}>Buscar</span>
            <span className="relative mt-1.5 block">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/50" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nome, e-mail ou telefone"
                className={cn(fieldClass, "pl-9")}
              />
            </span>
          </label>
          <label>
            <span className={labelClass}>Mostrar</span>
            <select name="filtro" defaultValue={filter} className={cn(fieldClass, "mt-1.5")}>
              {filters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Ordenar por</span>
            <select name="ordem" defaultValue={sort} className={cn(fieldClass, "mt-1.5")}>
              {sorts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button type="submit" className={cn(primaryButton, "flex-1")}>
              Aplicar
            </button>
            {filtering && (
              <Link href="/admin/clientes" className={secondaryButton}>
                Limpar
              </Link>
            )}
          </div>
        </form>
        </FilterPanel>
        </div>

        {visible.length === 0 ? (
          <div className="mt-4">
            <EmptyState>
              {all.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}
            </EmptyState>
          </div>
        ) : (
          <div className={cn(card, "mt-4 overflow-hidden")}>
            <table className="w-full text-left text-sm">
              <thead className="hidden border-b border-black/10 text-xs font-semibold tracking-widest text-black/60 md:table-header-group">
                <tr>
                  <th className="px-4 py-3">CLIENTE</th>
                  <th className="px-4 py-3">CONTATO</th>
                  <th className="px-4 py-3">VISITAS</th>
                  <th className="px-4 py-3">ÚLTIMA VISITA</th>
                  <th className="px-4 py-3">PRÓXIMO HORÁRIO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {visible.map((c) => (
                  // No mobile cada linha vira um cartão.
                  <tr key={c.id} className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 md:table-row md:p-0">
                    <td className="col-span-2 md:px-4 md:py-3">
                      <Link href={`/admin/clientes/${c.id}`} className="group flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black/10 text-sm font-semibold text-black">
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-black underline-offset-4 group-hover:underline">
                              {c.name}
                            </span>
                            {c.disabledAt && (
                              <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                Desativado
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-black/60">Desde {shortDate(c.createdAt)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="col-span-2 md:px-4 md:py-3">
                      <span className="block text-black">{formatPhone(c.phone)}</span>
                      <span className="block truncate text-black/60">{c.email}</span>
                    </td>
                    <td className="md:px-4 md:py-3">
                      <span className="font-semibold text-black">{c.visits}</span>
                      <span className="block text-xs text-black/60">
                        {formatPrice(c.spentCents)}
                        {c.missed > 0 && <span className="text-red-700"> · {c.missed} {c.missed === 1 ? "falta" : "faltas"}</span>}
                      </span>
                    </td>
                    <td className="md:px-4 md:py-3">
                      {c.lastVisit ? (
                        <>
                          <span className="block text-black">{shortDate(c.lastVisit.date)}</span>
                          <span className="block truncate text-xs text-black/60">
                            {c.lastVisit.serviceName}
                          </span>
                        </>
                      ) : (
                        <span className="text-black/50">—</span>
                      )}
                    </td>
                    <td className="col-span-2 md:px-4 md:py-3">
                      {c.nextBooking ? (
                        <span className="inline-flex rounded-full bg-[#121212] px-2.5 py-0.5 text-xs font-semibold text-white">
                          {shortDate(c.nextBooking.date)} · {c.nextBooking.time}
                        </span>
                      ) : (
                        <span className="text-black/50">Nenhum</span>
                      )}
                    </td>
                  </tr>
                ))}
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
                  href={pageHref(page - 1)}
                  className="inline-flex h-10 items-center gap-1 rounded-lg border border-black/20 bg-white px-3 font-semibold text-black hover:bg-black/5"
                >
                  <ChevronLeftIcon className="size-4" />
                  Anterior
                </Link>
              )}
              {page < pages && (
                <Link
                  href={pageHref(page + 1)}
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
