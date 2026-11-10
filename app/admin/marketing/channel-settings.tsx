import Link from "next/link";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { PlusIcon } from "@/app/_components/icons";
import type { Channel, SendRule } from "@/app/_lib/db";
import { emailProviderReady, getMarketingData, resolveTemplate } from "@/app/_lib/marketing";
import { deleteRule, setChannelEnabled, setDefaultTemplate, toggleRule } from "@/app/_lib/marketing-actions";
import { channelLabel } from "@/app/_lib/marketing-template";
import { cn } from "@/lib/utils";
import { RuleForm } from "./rule-form";
import { Badge, card, fieldClass, labelClass, linkButton, primaryButton, secondaryButton } from "./ui";

const paths: Record<Channel, string> = { email: "/admin/marketing/emails", mensagem: "/admin/marketing/mensagens" };

/** Tela de configuração de um canal. Só lê e altera dados do canal recebido. */
export async function ChannelSettings({
  channel,
  editId,
  creating,
}: {
  channel: Channel;
  editId?: string;
  creating: boolean;
}) {
  const data = await getMarketingData();
  const settings = data.settings[channel];
  const templates = data.templates.filter((t) => t.channel === channel);
  const activeTemplates = templates.filter((t) => t.active);
  const defaultTemplate = templates.find((t) => t.isDefault && t.active) ?? null;
  const rules = data.rules.filter((r) => r.channel === channel).sort((a, b) => a.daysAfter - b.daysAfter);
  const dispatches = data.dispatches.filter((d) => d.channel === channel);
  const authorized = data.customers.filter((c) => c.consent?.[channel]).length;
  const editing = editId ? rules.find((r) => r.id === editId) : undefined;
  const label = channelLabel[channel].toLowerCase();
  const plural = channel === "email" ? "e-mails" : "mensagens";

  function templateInfo(rule: SendRule) {
    const used = resolveTemplate(data.templates, rule);
    const own = rule.templateId ? templates.find((t) => t.id === rule.templateId) : undefined;
    if (!used) return { text: "Sem template: os envios vão falhar", warn: true };
    if (rule.templateId && own && !own.active) return { text: `“${own.name}” está inativo; usando o padrão “${used.name}”`, warn: true };
    return { text: rule.templateId ? used.name : `Padrão do canal (${used.name})`, warn: false };
  }

  return (
    <div className="flex flex-col gap-5">
      <section className={cn(card, "flex flex-wrap items-center gap-4 p-5")}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-black">Envios automáticos de {plural}</h2>
            <Badge tone={settings.enabled ? "dark" : "muted"}>{settings.enabled ? "Ligado" : "Desligado"}</Badge>
          </div>
          <p className="mt-1 text-sm text-black/70">
            {authorized} {authorized === 1 ? "cliente autorizou" : "clientes autorizaram"} receber {plural}.{" "}
            {channel === "email"
              ? emailProviderReady()
                ? "Envio pelo Resend configurado."
                : "Resend não configurado: defina RESEND_API_KEY e MARKETING_EMAIL_FROM, senão os envios ficam com falha."
              : "As mensagens chegam na conversa do cliente no chat do sistema."}
          </p>
        </div>
        <form action={setChannelEnabled}>
          <input type="hidden" name="canal" value={channel} />
          <input type="hidden" name="ativo" value={String(!settings.enabled)} />
          <button className={settings.enabled ? secondaryButton : primaryButton}>
            {settings.enabled ? `Desligar ${plural}` : `Ligar ${plural}`}
          </button>
        </form>
      </section>

      <section className={cn(card, "p-5")}>
        <h2 className="text-lg font-bold text-black">Template padrão</h2>
        <p className="mt-1 text-sm text-black/70">Usado pelas regras de {label} que não escolhem um template próprio.</p>
        <form action={setDefaultTemplate} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="canal" value={channel} />
          <label className="min-w-60 flex-1">
            <span className="sr-only">Template padrão</span>
            <select name="id" defaultValue={defaultTemplate?.id ?? ""} className={fieldClass}>
              <option value="">Nenhum</option>
              {activeTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button className={primaryButton}>Salvar</button>
          <Link href={`/admin/marketing/templates?canal=${channel}`} className={secondaryButton}>
            Gerenciar templates
          </Link>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h2 className="text-lg font-bold text-black">Regras de envio</h2>
            <p className="text-sm text-black/70">Cada regra envia uma vez por ciclo de ausência do cliente.</p>
          </div>
          {!creating && !editing && (
            <Link href={`${paths[channel]}?nova=1`} className={primaryButton}>
              <PlusIcon className="size-4" />
              Nova regra
            </Link>
          )}
        </div>

        {(creating || editing) && (
          <RuleForm
            key={editing?.id ?? "nova"}
            channel={channel}
            rule={editing}
            templates={activeTemplates.map((t) => ({ id: t.id, name: t.name }))}
            defaultName={defaultTemplate?.name ?? null}
            cancelHref={paths[channel]}
          />
        )}

        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/25 py-12 text-center text-black/70">
            Nenhuma regra de {label} ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rules.map((rule) => {
              const info = templateInfo(rule);
              const pending = dispatches.filter((d) => d.ruleId === rule.id && d.status === "pendente").length;
              const sent = dispatches.filter((d) => d.ruleId === rule.id && d.status === "enviado").length;
              return (
                <li key={rule.id} className={cn(card, "flex flex-wrap items-center gap-4 p-4", !rule.active && "opacity-70")}>
                  <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#121212] text-center text-white">
                    <span className="text-lg leading-none font-bold">{rule.daysAfter}</span>
                    <span className="text-[10px] font-semibold tracking-wide">DIAS</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-black">{rule.name}</h3>
                      <Badge tone={rule.active ? "outline" : "muted"}>{rule.active ? "Ativa" : "Pausada"}</Badge>
                    </div>
                    <p className="text-sm text-black/70">
                      Após {rule.daysAfter} {rule.daysAfter === 1 ? "dia" : "dias"} sem novo agendamento
                    </p>
                    <p className={cn("text-sm", info.warn ? "font-semibold text-amber-800" : "text-black/70")}>
                      Template: {info.text}
                    </p>
                    <p className="text-xs text-black/50">
                      {pending} {pending === 1 ? "pendente" : "pendentes"} · {sent}{" "}
                      {sent === 1 ? "enviado" : "enviados"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link href={`${paths[channel]}?editar=${rule.id}`} className={linkButton}>
                      Editar
                    </Link>
                    <form action={toggleRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button className={linkButton}>{rule.active ? "Pausar" : "Retomar"}</button>
                    </form>
                    <ConfirmButton
                      action={deleteRule}
                      fields={{ id: rule.id }}
                      title={`Excluir a regra “${rule.name}”?`}
                      description={
                        pending > 0
                          ? `${pending} ${pending === 1 ? "envio pendente é cancelado" : "envios pendentes são cancelados"}. O que já foi enviado continua no histórico.`
                          : "O que já foi enviado continua no histórico."
                      }
                      confirmLabel="Excluir regra"
                      successMessage="Regra excluída."
                      className="text-sm font-semibold text-red-700 underline-offset-4 hover:underline"
                    >
                      Excluir
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className={cn(labelClass, "font-normal")}>
          Pausar ou excluir uma regra remove os envios pendentes dela; o que já foi enviado continua no histórico.
        </p>
      </section>
    </div>
  );
}
