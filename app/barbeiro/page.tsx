import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { Badge, card, EmptyState, linkButton, PageTitle, scrollArea } from "@/app/_components/ui";
import { parseDate } from "@/app/_lib/agenda";
import { requireBarberPage } from "@/app/_lib/auth";
import { addDays, formatLongDate, formatWeekday, nowInStudio, toMinutes, toTime } from "@/app/_lib/availability";
import { getBarberAgenda } from "@/app/_lib/domain/barber";
import { formatPhone, oneParam } from "@/app/_lib/format";
import { statusOf } from "@/app/_lib/reservations";
import { cn } from "@/lib/utils";
import { AttendanceButtons } from "./attendance-buttons";

export const metadata: Metadata = {
  title: "Minha agenda | Studio Heitor Macks",
};

const STATUS = {
  agendado: { label: "Agendado", tone: "outline" },
  realizado: { label: "Realizado", tone: "green" },
  faltou: { label: "Faltou", tone: "red" },
  cancelada: { label: "Cancelada", tone: "muted" },
} as const;

const navButton =
  "flex size-11 items-center justify-center rounded-full border border-black/15 bg-white text-black transition hover:border-black/40";

// Os horários do dia do profissional ligado à conta. Sem preço: o barbeiro não vê faturamento.
export default async function BarbeiroPage(props: PageProps<"/barbeiro">) {
  const me = await requireBarberPage("/barbeiro");
  const now = nowInStudio();
  const date = parseDate(oneParam((await props.searchParams).data), now.date);
  const reservations = await getBarberAgenda(me.professional, date, date);
  const dayHref = (d: string) => (d === now.date ? "/barbeiro" : `/barbeiro?data=${d}`);

  return (
    <>
      <PanelHeader profileHref={me.role === "admin" ? "/admin/perfil" : "/conta"}>
        <PageTitle title="Minha agenda" description={`Horários de ${me.professional}.`} />
      </PanelHeader>

      <nav aria-label="Dia" className="mt-6 flex items-center gap-3">
        <Link href={dayHref(addDays(date, -1))} aria-label="Dia anterior" className={navButton}>
          <ChevronLeftIcon className="size-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-semibold text-black">{date === now.date ? "Hoje" : formatWeekday(date)}</p>
          <p className="truncate text-sm text-black/60">{formatLongDate(date)}</p>
        </div>
        <Link href={dayHref(addDays(date, 1))} aria-label="Próximo dia" className={navButton}>
          <ChevronRightIcon className="size-5" />
        </Link>
      </nav>
      {date !== now.date && (
        <p className="mt-2 text-center">
          <Link href="/barbeiro" className={linkButton}>
            Voltar para hoje
          </Link>
        </p>
      )}

      <div className={cn("mt-5", scrollArea)}>
        {reservations.length === 0 ? (
          <EmptyState>Nenhum horário neste dia.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {reservations.map((r) => {
              const status = STATUS[statusOf(r, now)];
              const end = toTime(toMinutes(r.time) + r.service.durationMinutes);
              const past = status.label !== "Agendado";
              return (
                <li key={r.id} className={cn(card, "flex flex-col gap-3 p-4")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-black tabular-nums">
                        {r.time}–{end}
                      </p>
                      <p className="font-semibold text-black">{r.service.name}</p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <div className="min-w-0 text-sm text-black/80">
                    <p className="font-medium break-words text-black">{r.customer.name}</p>
                    {r.customer.phone && (
                      <a href={`tel:+55${r.customer.phone}`} className="font-medium text-black underline underline-offset-4">
                        {formatPhone(r.customer.phone)}
                      </a>
                    )}
                    {r.note && <p className="mt-1 break-words text-black/70">“{r.note}”</p>}
                  </div>
                  {past && <AttendanceButtons id={r.id} attendance={r.attendance} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
