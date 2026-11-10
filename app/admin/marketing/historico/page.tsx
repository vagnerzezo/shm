import Link from "next/link";
import { FilterPanel } from "@/app/_components/filter-panel";
import { ChevronLeftIcon, ChevronRightIcon } from "@/app/_components/icons";
import { formatLongDate } from "@/app/_lib/availability";
import { formatClock, formatDay } from "@/app/_lib/chat-format";
import type { DispatchStatus } from "@/app/_lib/db";
import { channelOf, getMarketingData } from "@/app/_lib/marketing";
import { retryDispatch } from "@/app/_lib/marketing-actions";
import { htmlToText } from "@/app/_lib/email-html";
import { channelLabel } from "@/app/_lib/marketing-template";
import { normalize, oneParam } from "@/app/_lib/format";
import { cn } from "@/lib/utils";
import { card, dispatchStatuses, fieldClass, labelClass, linkButton, primaryButton, secondaryButton, StatusBadge } from "../ui";

const PAGE_SIZE = 25;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const one = oneParam;


export default async function MarketingHistoryPage(props: PageProps<"/admin/marketing/historico">) {
  const params = await props.searchParams;
  const canal = channelOf(one(params.canal)) ?? "";
  const status = dispatchStatuses.some((s) => s.id === one(params.status)) ? (one(params.status) as DispatchStatus) : "";
  const q = one(params.q).slice(0, 100);
  const de = DATE_RE.test(one(params.de)) ? one(params.de) : "";
  const ate = DATE_RE.test(one(params.ate)) ? one(params.ate) : "";

  const { dispatches, customers } = await getMarketingData();
  const byId = new Map(customers.map((c) => [c.id, c]));
  // Data de referência: quando foi enviado/encerrado ou, se pendente, quando vence.
  const dateOf = (d: (typeof dispatches)[number]) =>
    d.status === "pendente" ? d.dueDate : (d.sentAt ?? d.updatedAt).slice(0, 10);
  const needle = normalize(q);

  const rows = dispatches
    .filter((d) => {
      if (canal && d.channel !== canal) return false;
      if (status && d.status !== status) return false;
      const date = dateOf(d);
      if (de && date < de) return false;
      if (ate && date > ate) return false;
      if (needle) {
        const c = byId.get(d.customerId);
        if (!c || !normalize(`${c.name} ${c.email} ${c.phone}`).includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.sentAt ?? b.updatedAt).localeCompare(a.sentAt ?? a.updatedAt));

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(one(params.pagina)) || 1), pages);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtering = Boolean(canal || status || q || de || ate);
  const pageHref = (p: number) => {
    const query = new URLSearchParams(
      Object.entries({ canal, status, q, de, ate, pagina: String(p) }).filter(([, v]) => v),
    );
    return `/admin/marketing/historico?${query}`;
  };

  return (
    <>
      <FilterPanel activeCount={[canal, status, q, de, ate].filter(Boolean).length}>
      <form className={cn(card, "grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end")}>
        <label className="sm:col-span-2 lg:col-span-1">
          <span className={labelClass}>Cliente</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nome, e-mail ou telefone"
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
        <label>
          <span className={labelClass}>Canal</span>
          <select name="canal" defaultValue={canal} className={cn(fieldClass, "mt-1.5")}>
            <option value="">Todos</option>
            <option value="email">E-mail</option>
            <option value="mensagem">Mensagem</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Status</span>
          <select name="status" defaultValue={status} className={cn(fieldClass, "mt-1.5")}>
            <option value="">Todos</option>
            {dispatchStatuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>De</span>
          <input type="date" name="de" defaultValue={de} className={cn(fieldClass, "mt-1.5")} />
        </label>
        <label>
          <span className={labelClass}>Até</span>
          <input type="date" name="ate" defaultValue={ate} className={cn(fieldClass, "mt-1.5")} />
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className={cn(primaryButton, "h-11 flex-1")}>
            Filtrar
          </button>
          {filtering && (
            <Link href="/admin/marketing/historico" className={cn(secondaryButton, "h-11")}>
              Limpar
            </Link>
          )}
        </div>
      </form>
      </FilterPanel>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-black/25 py-14 text-center text-black/70">
          {filtering ? "Nenhum envio encontrado com esses filtros." : "Nenhum envio registrado ainda."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((d) => {
            const customer = byId.get(d.customerId);
            const when = d.sentAt ?? d.updatedAt;
            return (
              <li key={d.id} className={cn(card, "p-4")}>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-black">
                      {customer ? (
                        <Link
                          href={`/admin/historico?cliente=${customer.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {customer.name}
                        </Link>
                      ) : (
                        "Cliente removido"
                      )}
                      <span className="font-normal text-black/60"> · {channelLabel[d.channel]}</span>
                    </p>
                    <p className="text-sm text-black/70">
                      Regra “{d.ruleName}”{d.templateName && <> · template “{d.templateName}”</>}
                    </p>
                    <p className="text-sm text-black/60">
                      {d.status === "pendente"
                        ? `Vence em ${formatLongDate(d.dueDate)}`
                        : `${formatDay(when)} às ${formatClock(when)}`}{" "}
                      · última visita em {formatLongDate(d.lastVisitDate)}
                    </p>
                    {d.reason && (
                      <p className={cn("text-sm", d.status === "falha" ? "text-red-700" : "text-black/60")}>
                        {d.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {d.status === "falha" && (
                      <form action={retryDispatch}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className={linkButton}>Tentar de novo</button>
                      </form>
                    )}
                    <StatusBadge status={d.status} />
                  </div>
                </div>
                {d.body && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-semibold text-black/70 hover:text-black">
                      Ver conteúdo
                    </summary>
                    <div className="mt-2 rounded-lg border border-black/10 bg-white p-3 whitespace-pre-wrap text-black">
                      {d.subject && <p className="mb-2 font-semibold">{d.subject}</p>}
                      {htmlToText(d.body)}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="text-black/70">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} de {rows.length}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className={secondaryButton}>
                <ChevronLeftIcon className="size-4" />
                Anterior
              </Link>
            )}
            {page < pages && (
              <Link href={pageHref(page + 1)} className={secondaryButton}>
                Próxima
                <ChevronRightIcon className="size-4" />
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
