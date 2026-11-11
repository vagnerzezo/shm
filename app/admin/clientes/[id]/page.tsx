import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, ChatIcon, ListIcon, MegaphoneIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { Badge, card as cardBase, scrollArea, Stat } from "@/app/_components/ui";
import { shortDate } from "@/app/_lib/format";
import { agendaHref } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { formatLongDate, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { initials } from "@/app/_lib/chat-format";
import { getCustomer } from "@/app/_lib/customers";
import { getAgenda, isCancelled, isPast, statusOf, type AgendaReservation } from "@/app/_lib/reservations";
import { formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { AccessCard } from "./access-card";
import { CustomerEditForm } from "./customer-edit-form";

export const metadata: Metadata = {
  title: "Cliente | Studio Heitor Macks",
};

const card = `${cardBase} p-5`;
const actionLink =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-black/20 bg-white px-3 text-sm font-semibold text-black transition hover:bg-black/5";

function ReservationList({
  items,
  empty,
  now,
}: {
  items: AgendaReservation[];
  empty: string;
  now: { date: string; minutes: number };
}) {
  if (items.length === 0) return <p className="mt-2 text-sm text-black/60">{empty}</p>;
  return (
    <ul className="mt-2 divide-y divide-black/10">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={agendaHref("dia", r.date, r.id)}
            className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-black/[0.02]"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold text-black">{r.service.name}</span>
              <span className="block text-black/60">
                {formatWeekday(r.date)}, {formatLongDate(r.date)} · {r.time}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {statusOf(r, now) === "faltou" && <Badge tone="red">Faltou</Badge>}
              {statusOf(r, now) === "cancelada" && <Badge tone="outline">Cancelada</Badge>}
              <span
                className={cn(
                  "font-semibold text-black",
                  (statusOf(r, now) === "faltou" || statusOf(r, now) === "cancelada") && "text-black/40 line-through",
                )}
              >
                {formatPrice(r.service.priceCents)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ClientePage(props: PageProps<"/admin/clientes/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/clientes/${id}`);
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const now = nowInStudio();
  const reservations = (await getAgenda(undefined, undefined, { includeCancelled: true })).filter((r) => r.customer.id === id);
  // Canceladas ficam com as passadas, como registro; os próximos são só os que vão acontecer.
  const upcoming = reservations.filter((r) => !isPast(r, now) && !isCancelled(r));
  const past = reservations.filter((r) => isPast(r, now) || isCancelled(r)).reverse();

  return (
    <>
      <PanelHeader>
        <Link
          href="/admin/clientes"
          className="flex items-center gap-1.5 text-sm font-semibold text-black/70 hover:text-black"
        >
          <ArrowLeftIcon className="size-4" />
          Clientes
        </Link>
      </PanelHeader>

      <div className={`mt-4 ${scrollArea}`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#121212] text-lg font-bold text-white">
            {initials(customer.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-3xl font-bold tracking-tight text-black">{customer.name}</h1>
              {customer.disabledAt && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Desativado
                </span>
              )}
            </div>
            <p className="text-sm text-black/70">Cliente desde {shortDate(customer.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/chat?cliente=${id}`}
              className={cn(actionLink, "border-[#121212] bg-[#121212] text-white hover:bg-black/80")}
            >
              <ChatIcon className="size-4" />
              Conversar
            </Link>
            {!customer.disabledAt && (
              <Link href={`/admin/agenda/nova?cliente=${id}`} className={actionLink}>
                <CalendarIcon className="size-4" />
                Marcar horário
              </Link>
            )}
            <Link href={`/admin/historico?cliente=${id}`} className={actionLink}>
              <ListIcon className="size-4" />
              Histórico
            </Link>
            <Link
              href={`/admin/marketing/historico?q=${encodeURIComponent(customer.email)}`}
              className={actionLink}
            >
              <MegaphoneIcon className="size-4" />
              Comunicações
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="VISITAS"
            value={String(customer.visits)}
            hint={
              [
                customer.missed > 0 && `${customer.missed} ${customer.missed === 1 ? "falta" : "faltas"}`,
                customer.cancelled > 0 && `${customer.cancelled} ${customer.cancelled === 1 ? "cancelamento" : "cancelamentos"}`,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          />
          <Stat label="TOTAL GASTO" value={formatPrice(customer.spentCents)} />
          <Stat
            label="ÚLTIMA VISITA"
            value={customer.lastVisit ? shortDate(customer.lastVisit.date) : "—"}
            hint={customer.lastVisit?.serviceName}
          />
          <Stat
            label="PRÓXIMO HORÁRIO"
            value={
              customer.nextBooking
                ? `${shortDate(customer.nextBooking.date)} · ${customer.nextBooking.time}`
                : "—"
            }
            hint={customer.nextBooking?.serviceName}
          />
        </div>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <section className={card}>
              <h2 className="mb-4 text-lg font-bold text-black">Dados do cliente</h2>
              <CustomerEditForm customer={customer} />
            </section>
            <section className={card}>
              <h2 className="mb-4 text-lg font-bold text-black">Acesso</h2>
              <AccessCard
                customerId={customer.id}
                customerName={customer.name}
                disabledAt={customer.disabledAt}
                upcoming={upcoming.length}
              />
            </section>
          </div>

          <div className="flex flex-col gap-5">
            <section className={card}>
              <h2 className="text-lg font-bold text-black">Próximos horários</h2>
              <ReservationList items={upcoming} empty="Nenhum horário marcado." now={now} />
            </section>
            <section className={card}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-black">Últimas visitas</h2>
                {past.length > 5 && (
                  <Link
                    href={`/admin/historico?cliente=${id}`}
                    className="text-sm font-semibold text-black/70 underline-offset-4 hover:underline"
                  >
                    Ver todas ({past.length})
                  </Link>
                )}
              </div>
              <ReservationList items={past.slice(0, 5)} empty="Ainda não veio ao estúdio." now={now} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
