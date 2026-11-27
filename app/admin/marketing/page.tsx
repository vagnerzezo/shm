import Link from "next/link";
import { ChatIcon, MailIcon } from "@/app/_components/icons";
import { addDays, formatLongDate, nowInStudio } from "@/app/_lib/availability";
import { formatClock, formatDay } from "@/app/_lib/chat-format";
import type { Channel } from "@/app/_lib/db";
import { getMarketingData } from "@/app/_lib/marketing";
import { retryDispatch } from "@/app/_lib/marketing-actions";
import { channelLabel } from "@/app/_lib/marketing-template";
import { cn } from "@/lib/utils";
import { RunNow } from "./run-now";
import { card, ChannelSwitch, linkButton, secondaryButton } from "./ui";

const minutes = Math.max(1, Number(process.env.MARKETING_INTERVAL_MINUTES) || 15);

/** "No ar" se rodou há pouco (até duas vezes o intervalo). */
function ranRecently(iso?: string) {
  return Boolean(iso && Date.now() - new Date(iso).getTime() < 2 * minutes * 60_000);
}

export default async function MarketingOverviewPage() {
  const { templates, rules, dispatches, settings, customers } = await getMarketingData();
  const today = nowInStudio().date;
  const since = addDays(today, -30);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const recent = (iso?: string) => Boolean(iso && iso.slice(0, 10) >= since);
  const sentRecently = (channel: Channel) =>
    dispatches.filter((d) => d.channel === channel && d.status === "enviado" && recent(d.sentAt)).length;
  const failures = dispatches
    .filter((d) => d.status === "falha" && recent(d.updatedAt))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const upcoming = dispatches
    .filter((d) => d.status === "pendente")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const running = ranRecently(settings.lastRunAt);

  const counters = [
    { label: "E-mails enviados", short: "E-mails", value: sentRecently("email"), hint: "Últimos 30 dias" },
    { label: "Mensagens enviadas", short: "Mensagens", value: sentRecently("mensagem"), hint: "Últimos 30 dias" },
    { label: "Pendentes", short: "Pendentes", value: upcoming.length, hint: "Aguardando o prazo" },
    {
      label: "Falhas",
      short: "Falhas",
      value: failures.length,
      hint: failures.length === 0 ? "Nenhuma nos últimos 30 dias" : "Últimos 30 dias",
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 lg:gap-5">
      {/* Computador: execução no alto. Celular: vai para depois dos canais. */}
      <section className={cn(card, "flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 max-lg:order-1 lg:rounded-[20px] lg:px-5 lg:py-4")}>
        <span
          aria-hidden="true"
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            running ? "bg-[#16a34a] shadow-[0_0_0_4px_#dcfce7]" : "bg-[#a8a29e] shadow-[0_0_0_4px_#f0efee]",
          )}
        />
        <p className="min-w-0 flex-1 text-sm max-lg:basis-[calc(100%-1.75rem)]">
          <b>Execução automática</b>{" "}
          <span className="text-[#5c5c5a]">
            · roda a cada {minutes} min enquanto o servidor estiver no ar ·{" "}
            {settings.lastRunAt
              ? `última execução ${formatDay(settings.lastRunAt).toLowerCase()} às ${formatClock(settings.lastRunAt)}`
              : "ainda não executou"}
          </span>
        </p>
        <RunNow />
      </section>

      {/* Números: uma faixa com 4 colunas (celular mais compacto). */}
      <section aria-label="Números do marketing" className={cn(card, "py-3 lg:rounded-[20px] lg:py-0")}>
        <p className="mb-2 px-3.5 text-xs font-semibold text-[#5c5c5a] lg:hidden">Últimos 30 dias</p>
        <dl className="grid grid-cols-4">
          {counters.map((c, i) => (
            <div key={c.label} className={cn("flex flex-col px-3 lg:px-[22px] lg:py-4", i === 0 ? "pl-3.5" : "border-l border-[#f0efee]")}>
              <dt className="text-[11px] font-semibold text-[#5c5c5a] max-lg:order-2 lg:text-[13px]">
                <span className="lg:hidden">{c.short}</span>
                <span className="max-lg:hidden">{c.label}</span>
              </dt>
              <dd className="text-xl font-bold lg:mt-0.5 lg:text-[28px]">{c.value}</dd>
              <dd className="text-xs text-[#5c5c5a] max-lg:hidden">{c.hint}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-5">
        {(["email", "mensagem"] as const).map((channel) => {
          const channelRules = rules.filter((r) => r.channel === channel);
          const active = channelRules.filter((r) => r.active).length;
          const fallback = templates.find((t) => t.channel === channel && t.isDefault && t.active);
          const authorized = customers.filter((c) => c.consent?.[channel]).length;
          const enabled = settings[channel].enabled;
          const Icon = channel === "email" ? MailIcon : ChatIcon;
          return (
            <section key={channel} className={cn(card, "p-4 lg:rounded-[20px] lg:px-[22px] lg:py-5")}>
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f5f5f4] lg:hidden">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <h2 className="text-base font-bold lg:text-lg">{channelLabel[channel]}</h2>
                  <span className="block text-[13px] text-[#5c5c5a]">
                    {enabled ? "Ligado" : "Desligado"}
                    <span className="lg:hidden">
                      {" "}
                      · {authorized} {authorized === 1 ? "cliente autorizou" : "clientes autorizaram"}
                    </span>
                  </span>
                </span>
                <ChannelSwitch
                  channel={channel}
                  enabled={enabled}
                  label={channel === "email" ? "Envios automáticos por e-mail" : "Mensagens automáticas no chat"}
                />
              </div>

              {/* Celular: resumo numa linha. */}
              <p className="mt-3.5 rounded-xl bg-[#f5f5f4] p-3 text-[13px] text-[#44403c] lg:hidden">
                {channelRules.length === 0 && !fallback
                  ? "Nenhuma automação nem template padrão ainda."
                  : `${active} de ${channelRules.length} ${channelRules.length === 1 ? "automação ativa" : "automações ativas"} · Template padrão: ${fallback?.name ?? "nenhum"}`}
              </p>

              <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 text-sm max-lg:hidden">
                <dt className="text-[#5c5c5a]">Automações ativas</dt>
                <dd className="text-right font-semibold">
                  {active} de {channelRules.length}
                </dd>
                <dt className="text-[#5c5c5a]">Template padrão</dt>
                <dd className="max-w-60 truncate text-right font-semibold">{fallback?.name ?? "Nenhum"}</dd>
                <dt className="text-[#5c5c5a]">Clientes que autorizaram</dt>
                <dd className="text-right font-semibold">{authorized}</dd>
              </dl>

              <Link
                href={channel === "email" ? "/admin/marketing/emails" : "/admin/marketing/mensagens"}
                className={cn(secondaryButton, "mt-3 w-full lg:mt-[18px] lg:h-10")}
              >
                Configurar {channel === "email" ? "e-mails" : "mensagens"}
              </Link>
            </section>
          );
        })}
      </div>

      <div className="grid gap-3.5 max-lg:order-2 lg:grid-cols-2 lg:gap-5">
        <section className={cn(card, "px-4 py-4 lg:rounded-[20px] lg:px-[22px] lg:py-[18px]")}>
          <h2 className="text-base font-bold">Falhas recentes</h2>
          {failures.length === 0 ? (
            <p className="mt-1.5 text-sm text-[#5c5c5a]">Nenhuma falha nos últimos 30 dias.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#f0efee]">
              {failures.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {names.get(d.customerId) ?? "Cliente removido"} · {channelLabel[d.channel]}
                    </p>
                    <p className="text-xs text-[#b91c1c]">{d.reason}</p>
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

        <section className={cn(card, "px-4 py-4 lg:rounded-[20px] lg:px-[22px] lg:py-[18px]")}>
          <h2 className="text-base font-bold">Próximos envios</h2>
          {upcoming.length === 0 ? (
            <p className="mt-1.5 text-sm text-[#5c5c5a]">Nenhum envio pendente.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#f0efee]">
              {upcoming.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{names.get(d.customerId) ?? "Cliente removido"}</span>
                    <span className="block truncate text-[#5c5c5a]">
                      {channelLabel[d.channel]} · {d.ruleName}
                    </span>
                  </span>
                  <span className="shrink-0 text-[#5c5c5a]">{formatLongDate(d.dueDate)}</span>
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
