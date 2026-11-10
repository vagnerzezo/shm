import { roleOf } from "./auth";
import { addDays, formatLongDate, nowInStudio } from "./availability";
import { addMessage } from "./chat";
import { dayKey } from "./chat-format";
import {
  readDb,
  updateDb,
  type Channel,
  type Dispatch,
  type SendRule,
  type StoredReservation,
  type Template,
  type User,
} from "./db";
import { contentToHtml, emailReadyHtml, escapeHtml, htmlToText, renderHtmlTemplate } from "./email-html";
import { renderTemplate, sampleValues, type VariableKey } from "./marketing-template";
import { isPast } from "./reservations";
import { catalogOf } from "./catalog";
import { getStudio, studioOf } from "./studio";
import { findService, type Service } from "./services";

// Envios automáticos de marketing. Cada canal tem suas próprias regras; o
// motor só junta os dois para rodar numa passada. A cada execução ele:
//   1. remove pendentes que não valem mais (regra pausada, editada, canal desligado)
//      e cancela os de quem fez um novo agendamento;
//   2. agenda um pendente por cliente + regra + última visita;
//   3. envia os que venceram.

/** Envio que ficou "enviando" além disso foi interrompido (ex.: servidor reiniciou). */
const STALE_SENDING_MS = 10 * 60 * 1000;

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function emailProviderReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MARKETING_EMAIL_FROM);
}

type Visit = { reservation: StoredReservation; hasUpcoming: boolean };

/** Última visita (reserva que já passou) de cada cliente e se ele tem horário marcado. */
function visitsOf(reservations: StoredReservation[], now: { date: string; minutes: number }) {
  const visits = new Map<string, Visit>();
  const upcoming = new Set<string>();
  for (const r of reservations) {
    if (!isPast(r, now)) {
      upcoming.add(r.userId);
      continue;
    }
    // Falta não conta como visita.
    if (r.attendance === "faltou") continue;
    const current = visits.get(r.userId)?.reservation;
    if (!current || `${r.date} ${r.time}` > `${current.date} ${current.time}`) {
      visits.set(r.userId, { reservation: r, hasUpcoming: false });
    }
  }
  for (const [userId, visit] of visits) visit.hasUpcoming = upcoming.has(userId);
  return visits;
}

/** Template da regra; se ele estiver inativo ou tiver sido removido, o padrão do canal. */
export function resolveTemplate(templates: Template[], rule: Pick<SendRule, "channel" | "templateId">) {
  const own = rule.templateId && templates.find((t) => t.id === rule.templateId && t.active);
  return own || templates.find((t) => t.channel === rule.channel && t.isDefault && t.active) || null;
}

function valuesFor(
  user: User,
  visit: StoredReservation,
  today: string,
  services: Service[],
  studio: string,
): Record<VariableKey, string> {
  const service = findService(services, visit.serviceId);
  const days = Math.round((Date.parse(today) - Date.parse(visit.date)) / 86_400_000);
  return {
    nome: user.name,
    primeiro_nome: user.name.split(" ")[0],
    ultima_visita: formatLongDate(visit.date),
    dias_sem_visita: String(days),
    ultimo_servico: service?.name ?? "",
    profissional: service?.professional ?? "nossa equipe",
    link_agendamento: `${appUrl()}/agendamento`,
    estudio: studio,
  };
}

/** Corpo do e-mail com as variáveis trocadas (valores escapados como HTML). */
function renderEmailBody(body: string, values: Record<string, string>) {
  return renderHtmlTemplate(contentToHtml(body), values);
}

async function sendEmailContent(to: string, subject: string, body: string, idempotencyKey: string) {
  if (!emailProviderReady()) {
    throw new Error("Provedor de e-mail não configurado (RESEND_API_KEY e MARKETING_EMAIL_FROM).");
  }
  const studio = (await getStudio()).name;
  const footer = `Você recebe este e-mail porque autorizou comunicações do ${studio}. Para deixar de receber, acesse ${appUrl()}/conta.`;
  // `body` já é HTML filtrado (ou texto puro de templates antigos).
  const content = emailReadyHtml(contentToHtml(body), appUrl());
  const text = `${htmlToText(body)}\n\n—\n${footer}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#121212">${content}<hr style="margin:24px 0;border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#666">${escapeHtml(footer)}</p></div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      // Se a mesma requisição for repetida, o Resend não envia de novo.
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.MARKETING_EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Resend respondeu ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
}

async function sendEmail(dispatch: Dispatch, to: string) {
  return sendEmailContent(to, dispatch.subject ?? "", dispatch.body ?? "", dispatch.id);
}

export async function sendTemplateTest(template: Template, to: string) {
  return sendEmailContent(
    to,
    renderTemplate(template.subject ?? "", sampleValues),
    renderEmailBody(template.body, sampleValues),
    `template-test:${crypto.randomUUID()}`,
  );
}

async function deliver(dispatch: Dispatch, to: string) {
  if (dispatch.channel === "email") return sendEmail(dispatch, to);
  const ok = await addMessage(dispatch.customerId, "admin", dispatch.body ?? "");
  if (!ok) throw new Error("Cliente não encontrado.");
}

export type RunResult = { scheduled: number; cancelled: number; sent: number; failed: number };

let running: Promise<RunResult> | null = null;

/**
 * Executa o motor. Com `send: false` só agenda e cancela (usado depois de
 * mudar uma configuração). Duas chamadas ao mesmo tempo compartilham a execução.
 */
export function runMarketing({ send = true } = {}): Promise<RunResult> {
  if (running) return running;
  running = run(send).finally(() => {
    running = null;
  });
  return running;
}

async function run(send: boolean): Promise<RunResult> {
  const now = nowInStudio();
  const stamp = () => new Date().toISOString();
  const result: RunResult = { scheduled: 0, cancelled: 0, sent: 0, failed: 0 };

  const ready = await updateDb((db) => {
    const visits = visitsOf(db.reservations, now);
    const users = new Map(db.users.map((u) => [u.id, u]));
    const rules = new Map(db.rules.map((r) => [r.id, r]));
    const finish = (d: Dispatch, status: "cancelado" | "falha", reason: string) => {
      Object.assign(d, { status, reason, updatedAt: stamp() });
      result[status === "cancelado" ? "cancelled" : "failed"]++;
    };

    // 1. Pendentes que perderam o sentido.
    db.dispatches = db.dispatches.filter((d) => {
      if (d.status === "enviando" && Date.now() - Date.parse(d.updatedAt) > STALE_SENDING_MS) {
        finish(d, "falha", "Envio interrompido. Use \"Tentar de novo\" se ele não chegou.");
      }
      if (d.status !== "pendente") return true;
      const rule = rules.get(d.ruleId);
      // Projeção da regra atual: some se a regra mudou, pausou ou o canal foi desligado.
      // Quem já teve tentativa (falha reenviada) fica no histórico como cancelado.
      const stale =
        !rule ||
        !rule.active ||
        !db.marketing[d.channel].enabled ||
        d.dueDate !== addDays(d.lastVisitDate, rule.daysAfter);
      if (stale) {
        if (!d.templateId) return false;
        finish(d, "cancelado", "A regra ou o canal mudou antes do reenvio.");
        return true;
      }
      const visit = visits.get(d.customerId);
      if (!visit || visit.reservation.id !== d.lastVisitId || visit.hasUpcoming) {
        finish(d, "cancelado", "Cliente fez um novo agendamento.");
      }
      return true;
    });

    // 2. Agenda um envio por cliente + regra + última visita.
    const keys = new Set(db.dispatches.map((d) => d.key));
    for (const user of db.users) {
      const visit = visits.get(user.id);
      if (roleOf(user) === "admin" || user.disabledAt || !visit || visit.hasUpcoming) continue;
      for (const rule of db.rules) {
        const channel = db.marketing[rule.channel];
        if (!rule.active || !channel.enabled) continue;
        const dueDate = addDays(visit.reservation.date, rule.daysAfter);
        // Sem envios retroativos: só ausências que vencem depois de a regra/canal ser ligado.
        const since = [rule.activeSince, channel.enabledSince].filter(Boolean).map((t) => dayKey(t!));
        if (since.some((s) => dueDate < s)) continue;
        const key = `${user.id}|${rule.id}|${visit.reservation.id}`;
        if (keys.has(key)) continue;
        keys.add(key);
        db.dispatches.push({
          id: crypto.randomUUID(),
          key,
          customerId: user.id,
          channel: rule.channel,
          ruleId: rule.id,
          ruleName: rule.name,
          lastVisitId: visit.reservation.id,
          lastVisitDate: visit.reservation.date,
          dueDate,
          status: "pendente",
          createdAt: stamp(),
          updatedAt: stamp(),
        });
        result.scheduled++;
      }
    }

    if (!send) return [];
    db.marketing.lastRunAt = stamp();

    // 3. Separa os que venceram e marca como "enviando", para nenhuma outra execução pegá-los.
    const catalog = catalogOf(db);
    const studioName = studioOf(db).name;
    const vencidos = db.dispatches.filter((d) => d.status === "pendente" && d.dueDate <= now.date);
    // Várias regras do mesmo canal vencidas juntas (ex.: servidor ficou fora do ar):
    // só a de maior prazo sai, para o cliente não receber tudo de uma vez.
    const latest = new Map<string, Dispatch>();
    for (const d of vencidos) {
      const k = `${d.customerId}|${d.channel}`;
      const other = latest.get(k);
      if (!other || rules.get(d.ruleId)!.daysAfter > rules.get(other.ruleId)!.daysAfter) latest.set(k, d);
    }
    const due: { dispatch: Dispatch; to: string }[] = [];
    for (const d of vencidos) {
      const winner = latest.get(`${d.customerId}|${d.channel}`)!;
      if (winner !== d) {
        finish(d, "cancelado", `Substituído pela regra "${winner.ruleName}", que venceu junto.`);
        continue;
      }
      const user = users.get(d.customerId);
      const rule = rules.get(d.ruleId)!;
      if (!user) {
        finish(d, "cancelado", "Cliente removido.");
        continue;
      }
      if (user.disabledAt) {
        finish(d, "cancelado", "Cliente desativado.");
        continue;
      }
      if (!user.consent?.[d.channel]) {
        finish(d, "cancelado", "Cliente não autorizou este canal.");
        continue;
      }
      const template = resolveTemplate(db.templates, rule);
      if (!template) {
        finish(d, "falha", "Nenhum template ativo para a regra nem template padrão no canal.");
        continue;
      }
      const values = valuesFor(user, visits.get(user.id)!.reservation, now.date, catalog.services, studioName);
      Object.assign(d, {
        status: "enviando",
        templateId: template.id,
        templateName: template.name,
        subject: template.subject ? renderTemplate(template.subject, values) : undefined,
        body: template.channel === "email" ? renderEmailBody(template.body, values) : renderTemplate(template.body, values),
        updatedAt: stamp(),
      });
      due.push({ dispatch: { ...d }, to: user.email });
    }
    return due;
  });

  // Envia fora da transação: rede lenta não trava o banco.
  const outcomes: { id: string; error?: string }[] = [];
  for (const { dispatch, to } of ready) {
    try {
      await deliver(dispatch, to);
      outcomes.push({ id: dispatch.id });
    } catch (error) {
      outcomes.push({ id: dispatch.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (outcomes.length > 0) {
    await updateDb((db) => {
      for (const { id, error } of outcomes) {
        const d = db.dispatches.find((x) => x.id === id);
        if (!d) continue;
        if (error) {
          Object.assign(d, { status: "falha", reason: error, updatedAt: stamp() });
          result.failed++;
        } else {
          Object.assign(d, { status: "enviado", reason: undefined, sentAt: stamp(), updatedAt: stamp() });
          result.sent++;
        }
      }
    });
  }
  return result;
}

export async function getMarketingData() {
  const db = await readDb();
  return {
    templates: db.templates,
    rules: db.rules,
    dispatches: db.dispatches,
    settings: db.marketing,
    customers: db.users.filter((u) => roleOf(u) === "cliente"),
  };
}

export function channelOf(raw: unknown): Channel | null {
  return raw === "email" || raw === "mensagem" ? raw : null;
}
