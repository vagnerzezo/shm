import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon, XIcon } from "@/app/_components/icons";
import {
  formatLongDate,
  formatShortMonth,
  formatWeekday,
  nowInStudio,
} from "@/app/_lib/availability";
import {
  endTime,
  parseItems,
  toKeys,
  withItems,
  type BookingItem,
} from "@/app/_lib/booking";
import { getCurrentUser, loginHref } from "@/app/_lib/auth";
import { getBookingBusy } from "@/app/_lib/reservations";
import { getBookableServices } from "@/app/_lib/catalog";
import { formatDuration, formatPrice } from "@/app/_lib/services";
import { PanelHeader } from "@/app/_components/panel-header";
import { SummaryForm } from "./summary-form";
import { getAvailabilityRules } from "@/app/_lib/schedule";

export const metadata: Metadata = {
  title: "Revise e confirme | Studio Heitor Macks",
};

function ItemCard({ item, removeHref }: { item: BookingItem; removeHref: string }) {
  const { service, date, time } = item;
  return (
    <li className="flex gap-6 rounded-xl border border-black/10 bg-white/85 p-6">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-black/15 pr-6 text-black sm:w-28">
        <span className="text-xs font-semibold tracking-widest">{formatShortMonth(date)}</span>
        <span className="text-4xl font-bold leading-tight">{Number(date.slice(8))}</span>
        <span className="text-sm font-semibold">{time}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold leading-snug text-black">{service.name}</h2>
          <Link
            href={removeHref}
            className="flex shrink-0 items-center gap-1.5 pt-1 text-sm font-semibold text-black hover:text-black/60"
          >
            <XIcon className="size-4" />
            Remover
          </Link>
        </div>
        <p className="mt-1 text-sm text-black/70">
          {formatWeekday(date)}, {formatLongDate(date)} · {time} às{" "}
          {endTime(time, service.durationMinutes)}
        </p>
        <p className="mt-1 text-sm text-black/70">
          {service.professional && <>Profissional: {service.professional} · </>}
          {formatDuration(service.durationMinutes)}
        </p>
        <p className="mt-2 text-lg font-bold text-black">{formatPrice(service.priceCents)}</p>
      </div>
    </li>
  );
}

export default async function ConfirmacaoPage(props: PageProps<"/agendamento/confirmacao">) {
  const { item } = await props.searchParams;
  const user = await getCurrentUser();
  const booked = await getBookingBusy(user?.id);
  const items = parseItems(item, nowInStudio(), booked, await getAvailabilityRules(), await getBookableServices()).sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
  if (items.length === 0) redirect("/agendamento");
  const dropped = toKeys(item).length - items.length;

  const keys = items.map((i) => i.key);
  const total = items.reduce((sum, i) => sum + i.service.priceCents, 0);

  return (
    <>
      <PanelHeader step={2}>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-black sm:text-4xl">
          Revise e confirme
        </h1>
      </PanelHeader>

      <div className="mt-7 grid min-h-0 flex-1 items-start gap-6 overflow-y-auto pr-1 [scrollbar-width:thin] lg:grid-cols-[1fr_minmax(0,380px)]">
        <div>
          {dropped > 0 && (
            <p
              role="status"
              className="mb-4 rounded-lg border border-black/20 bg-white/85 px-4 py-3 text-sm text-black"
            >
              {dropped === 1
                ? "Um horário foi removido porque não está mais disponível ou conflita com outra reserva sua."
                : `${dropped} horários foram removidos porque não estão mais disponíveis ou conflitam com outras reservas suas.`}
            </p>
          )}
          <h2 className="text-xs font-semibold tracking-widest text-black/70">SEU AGENDAMENTO</h2>
          <ul className="mt-3 flex flex-col gap-4">
            {items.map((i) => {
              const rest = keys.filter((k) => k !== i.key);
              return (
                <ItemCard
                  key={i.key}
                  item={i}
                  removeHref={
                    rest.length ? withItems("/agendamento/confirmacao", rest) : "/agendamento"
                  }
                />
              );
            })}
          </ul>
          <Link
            href={withItems("/agendamento", keys)}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg border border-black bg-white px-5 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
          >
            <PlusIcon className="size-4" />
            Adicionar outro serviço
          </Link>
        </div>

        <SummaryForm
          subtotalCents={total}
          itemKeys={keys}
          userName={user?.name ?? null}
          loginUrl={loginHref(withItems("/agendamento/confirmacao", keys))}
        />
      </div>
    </>
  );
}
