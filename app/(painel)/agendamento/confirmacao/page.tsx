import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingHeader } from "@/app/_components/client/booking-header";
import { clientField, displayClass } from "@/app/_components/client/ui";
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
import { getCurrentUser, keepBarberOut, loginHref } from "@/app/_lib/auth";
import { getBookingBusy } from "@/app/_lib/reservations";
import { getBookableServices } from "@/app/_lib/catalog";
import { formatDuration, formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { SummaryForm } from "./summary-form";
import { getAvailabilityRules } from "@/app/_lib/schedule";

export const metadata: Metadata = {
  title: "Revise e confirme | Studio Heitor Macks",
};

function ItemCard({ item, removeHref }: { item: BookingItem; removeHref: string }) {
  const { service, date, time } = item;
  return (
    <li className="flex items-start gap-3.5 bg-white p-3.5 max-lg:border-b max-lg:border-[#f0efee] max-lg:last:border-0 lg:items-center lg:gap-5 lg:rounded-[20px] lg:border lg:border-[#e7e5e4] lg:p-5">
      <span className="w-14 shrink-0 rounded-[14px] bg-[#f5f5f4] py-2 text-center lg:w-[76px] lg:rounded-2xl lg:py-2.5">
        <span className="block text-[11px] font-bold text-[#5c5c5a] uppercase lg:text-xs">{formatWeekday(date).slice(0, 3)}</span>
        <span className="block text-[22px] leading-tight font-bold lg:text-[30px]">{Number(date.slice(8))}</span>
        <span className="block text-xs font-bold lg:text-[13px]">{time}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold break-words lg:text-xl">{service.name}</span>
        <span className="block text-[13px] text-[#5c5c5a] lg:mt-1 lg:text-sm">
          <span className="lg:hidden">{formatLongDate(date).replace(/ de \d{4}$/, "")}</span>
          <span className="max-lg:hidden">{formatWeekday(date)}, {formatLongDate(date)}</span> · {time} – {endTime(time, service.durationMinutes)}
        </span>
        <span className="block text-[13px] text-[#5c5c5a] lg:text-sm">
          {service.professional ? `${service.professional} · ` : "Qualquer profissional · "}
          {formatDuration(service.durationMinutes)}
        </span>
        <span className="mt-1 block text-[15px] font-bold lg:hidden">{formatPrice(service.priceCents)}</span>
      </span>
      <span className="text-xl font-bold max-lg:hidden">{formatPrice(service.priceCents)}</span>
      <Link
        href={removeHref}
        aria-label={`Remover ${service.name}`}
        className="grid size-10 shrink-0 place-items-center rounded-[10px] text-[#5c5c5a] transition hover:bg-[#f5f5f4] hover:text-[#121212]"
      >
        <XIcon className="size-[18px]" />
      </Link>
    </li>
  );
}

export default async function ConfirmacaoPage(props: PageProps<"/agendamento/confirmacao">) {
  const { item } = await props.searchParams;
  const user = await getCurrentUser();
  keepBarberOut(user);
  const booked = await getBookingBusy(user?.id);
  const items = parseItems(item, nowInStudio(), booked, await getAvailabilityRules(), await getBookableServices()).sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
  if (items.length === 0) redirect("/agendamento");
  const dropped = toKeys(item).length - items.length;
  const keys = items.map((i) => i.key);
  const last = items.at(-1)!;

  return (
    <>
      <BookingHeader step={2} back={withItems(`/agendamento/horario?servico=${last.service.id}`, keys.slice(0, -1))} />
      <h1 className={cn(displayClass, "mb-3.5 text-4xl lg:mb-[22px] lg:text-[52px]")}>Revise e confirme</h1>

      <SummaryForm
        lines={items.map((i) => ({ key: i.key, name: i.service.name, priceCents: i.service.priceCents }))}
        userName={user?.name ?? null}
        loginUrl={loginHref(withItems("/agendamento/confirmacao", keys))}
      >
        {dropped > 0 && (
          <p role="status" className="rounded-[14px] border border-[#e7e5e4] bg-white px-4 py-3 text-sm">
            {dropped === 1
              ? "Um horário foi removido porque não está mais disponível ou conflita com outra reserva sua."
              : `${dropped} horários foram removidos porque não estão mais disponíveis ou conflitam com outras reservas suas.`}
          </p>
        )}

        <section className="overflow-hidden max-lg:rounded-[18px] max-lg:border max-lg:border-[#e7e5e4] max-lg:bg-white">
          <ul className="flex flex-col lg:gap-3.5">
            {items.map((i) => {
              const rest = keys.filter((k) => k !== i.key);
              return (
                <ItemCard
                  key={i.key}
                  item={i}
                  removeHref={rest.length ? withItems("/agendamento/confirmacao", rest) : "/agendamento"}
                />
              );
            })}
          </ul>
          <Link
            href={withItems("/agendamento", keys)}
            className="flex h-12 items-center gap-2 border-t border-[#f0efee] px-3.5 text-sm font-semibold lg:mt-3.5 lg:h-[52px] lg:justify-center lg:rounded-2xl lg:border lg:border-dashed lg:border-[#a8a29e] lg:hover:border-[#121212]"
          >
            <PlusIcon className="size-[18px]" />
            Adicionar outro serviço
          </Link>
        </section>

        {/* Observação só no computador (decisão de 2026-11-25: confirmação curta no celular). */}
        {user && (
          <label className="mt-2 flex flex-col gap-2 text-sm font-bold max-lg:hidden">
            <span>
              Observação
              <span className="block text-[13px] font-medium text-[#5c5c5a]">Opcional · o profissional vê antes do horário</span>
            </span>
            <textarea
              name="observacao"
              rows={3}
              maxLength={300}
              placeholder="Algo que o profissional deva saber?"
              className={cn(clientField, "resize-y py-3 text-[15px] font-normal")}
            />
          </label>
        )}
      </SummaryForm>
    </>
  );
}
