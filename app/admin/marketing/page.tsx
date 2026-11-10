import Link from "next/link";
import { addDays, formatLongDate, nowInStudio } from "@/app/_lib/availability";
import { formatClock, formatDay } from "@/app/_lib/chat-format";
import type { Channel } from "@/app/_lib/db";
import { getMarketingData } from "@/app/_lib/marketing";
import { retryDispatch } from "@/app/_lib/marketing-actions";
import { channelLabel } from "@/app/_lib/marketing-template";
import { cn } from "@/lib/utils";
import { RunNow } from "./run-now";
import { Badge, card, linkButton, Stat } from "./ui";

const minutes = Math.max(1, Number(process.env.MARKETING_INTERVAL_MINUTES) || 15);

export default async function MarketingOverviewPage() {
  const { templates, rules, dispatches, settings, customers } = await getMarketingData();
  const today = nowInStudio().date;
  const since = addDays(today, -30);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const recent = (iso?: string) => Boolean(iso && iso.slice(0, 10) >= since);
  const sent = (channel: Channel) => dispatches.filter((d) => d.channel === channel && d.status === "enviado");
  const failures = dispatches
    .filter((d) => d.status === "falha" && recent(d.updatedAt))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const upcoming = dispatches
    .filter((d) => d.status === "pendente")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="E-MAILS ENVIADOS"
          value={String(sent("email").length)}
          hint={`${sent("email").filter((d) => recent(d.sentAt)).length} nos últimos 30 dias`}
        />
        <Stat
          label="MENSAGENS ENVIADAS"
          value={String(sent("mensagem").length)}
          hint={`${sent("mensagem").filter((d) => recent(d.sentAt)).length} nos últimos 30 dias`}
        />
        <Stat label="PENDENTES" value={String(upcoming.length)} hint="Aguardando o prazo" />
        <Stat label="FALHAS" value={String(failures.length)} hint="Nos últimos 30 dias" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["email", "mensagem"] as const).map((channel) => {
          const channelRules = rules.filter((r) => r.channel === channel);
          const active = channelRules.filter((r) => r.active).length;
          const fallback = templates.find((t) => t.channel === channel && t.isDefault && t.active);
          return (
            <section key={channel} className={cn(card, "p-5")}>
              <div className="flex items-center gap-2">
                <h2 className="mr-auto text-lg font-bold text-black">{channelLabel[channel]}</h2>
                <Badge tone={settings[channel].enabled ? "dark" : "muted"}>
                  {settings[channel].enabled ? "Ligado" : "Desligado"}
                </Badge>
              </div>
              <dl className="mt-3 grid gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-black/60">Automações ativas</dt>
                  <dd className="font-semibold text-black">
                    {active} de {channelRules.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-black/60">Template padrão</dt>
                  <dd className="truncate font-semibold text-black">{fallback?.name ?? "Nenhum"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-black/60">Clientes que autorizaram</dt>
                  <dd className="font-semibold text-black">{customers.filter((c) => c.consent?.[channel]).length}</dd>
                </div>
              </dl>
              <Link
                href={channel === "email" ? "/admin/marketing/emails" : "/admin/marketing/mensagens"}
                className={cn(linkButton, "mt-3 inline-block")}
              >
                Configurar {channel === "email" ? "e-mails" : "mensagens"}
              </Link>
            </section>
          );
        })}
      </div>

      <section className={cn(card, "flex flex-wrap items-center gap-4 p-5")}>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-black">Execução</h2>
          <p className="text-sm text-black/70">
            Roda sozinha a cada {minutes} min enquanto o servidor estiver no ar.{" "}
            {settings.lastRunAt
              ? `Última execução: ${formatDay(settings.lastRunAt).toLowerCase()} às ${formatClock(settings.lastRunAt)}.`
              : "Ainda não executou."}
          </p>
        </div>
        <RunNow />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cn(card, "p-5")}>
          <h2 className="text-lg font-bold text-black">Falhas recentes</h2>
          {failures.length === 0 ? (
            <p className="mt-2 text-sm text-black/60">Nenhuma falha nos últimos 30 dias.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/10">
              {failures.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-black">
                      {names.get(d.customerId) ?? "Cliente removido"} · {channelLabel[d.channel]}
                    </p>
                    <p className="text-xs text-red-700">{d.reason}</p>
                  </div>
                  <form action={retryDispatch}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className={linkButton}>Tentar de novo</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {failures.length > 5 && (
            <Link href="/admin/marketing/historico?status=falha" className={cn(linkButton, "mt-2 inline-block")}>
              Ver todas
            </Link>
          )}
        </section>

        <section className={cn(card, "p-5")}>
          <h2 className="text-lg font-bold text-black">Próximos envios</h2>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-black/60">Nenhum envio pendente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/10">
              {upcoming.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-black">
                      {names.get(d.customerId) ?? "Cliente removido"}
                    </span>
                    <span className="block truncate text-black/60">
                      {channelLabel[d.channel]} · {d.ruleName}
                    </span>
                  </span>
                  <span className="shrink-0 text-black/70">{formatLongDate(d.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
          {upcoming.length > 5 && (
            <Link href="/admin/marketing/historico?status=pendente" className={cn(linkButton, "mt-2 inline-block")}>
              Ver todos
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
