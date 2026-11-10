"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { updateDb, type Channel } from "./db";
import { channelOf, getMarketingData, runMarketing, sendTemplateTest, type RunResult } from "./marketing";
import { htmlToText, sanitizeHtml } from "./email-html";
import { withNotice } from "./notices";
import { channelLabel, LIMITS, unknownVariables } from "./marketing-template";

export type MarketingFormState = { error: string | null };
export type TemplateTestState = { error: string | null; sent: boolean };

const paths: Record<Channel, string> = { email: "/admin/marketing/emails", mensagem: "/admin/marketing/mensagens" };

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login?next=%2Fadmin%2Fmarketing");
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function sendTemplateTestAction(
  _prev: TemplateTestState,
  formData: FormData,
): Promise<TemplateTestState> {
  await assertAdmin();
  const id = text(formData, "id");
  const email = text(formData, "email");
  if (!id) return { error: "Template não informado.", sent: false };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido.", sent: false };
  }

  const { templates } = await getMarketingData();
  const template = templates.find((item) => item.id === id);
  if (!template) return { error: "Template não encontrado.", sent: false };
  if (template.channel !== "email") return { error: "O disparo de teste está disponível apenas para e-mail.", sent: false };

  try {
    await sendTemplateTest(template, email);
    return { error: null, sent: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível enviar o teste.", sent: false };
  }
}

// ---------- Templates ----------

export async function saveTemplate(_prev: MarketingFormState, formData: FormData): Promise<MarketingFormState> {
  await assertAdmin();
  const id = text(formData, "id");
  const channel = channelOf(formData.get("canal"));
  if (!channel) return { error: "Escolha o canal do template." };
  const name = text(formData, "nome");
  const subject = text(formData, "assunto");
  const raw = String(formData.get("conteudo") ?? "").trim();
  // E-mail aceita HTML (editor visual); só as tags permitidas são guardadas.
  const body = channel === "email" ? sanitizeHtml(raw).trim() : raw;
  const active = formData.get("ativo") === "on";
  const isDefault = formData.get("padrao") === "on";

  if (name.length < 2 || name.length > LIMITS.name) return { error: `Dê um nome de 2 a ${LIMITS.name} caracteres.` };
  if (channel === "email" && (subject.length < 2 || subject.length > LIMITS.subject)) {
    return { error: `O assunto do e-mail precisa ter de 2 a ${LIMITS.subject} caracteres.` };
  }
  const hasContent = htmlToText(body).length >= 2 || (channel === "email" && /<img\b/i.test(body));
  if (!hasContent) return { error: "Escreva o conteúdo." };
  if (body.length > LIMITS.body[channel]) {
    return { error: `O conteúdo de ${channelLabel[channel].toLowerCase()} pode ter até ${LIMITS.body[channel]} caracteres.` };
  }
  const unknown = unknownVariables(`${subject} ${body}`);
  if (unknown.length > 0) return { error: `Variável desconhecida: ${unknown.map((k) => `{{${k}}}`).join(", ")}.` };
  if (isDefault && !active) return { error: "O template padrão precisa estar ativo." };

  const error = await updateDb((db) => {
    const now = new Date().toISOString();
    const current = id ? db.templates.find((t) => t.id === id) : undefined;
    if (id && !current) return "Template não encontrado.";
    if (current && current.channel !== channel && db.rules.some((r) => r.templateId === id)) {
      return "Este template está em uso por regras do outro canal; o canal não pode mudar.";
    }
    if (isDefault) {
      for (const t of db.templates) if (t.channel === channel) t.isDefault = false;
    }
    const data = {
      name,
      channel,
      subject: channel === "email" ? subject : undefined,
      body,
      active,
      isDefault,
      updatedAt: now,
    };
    if (current) Object.assign(current, data);
    else db.templates.push({ id: crypto.randomUUID(), createdAt: now, ...data });
    return null;
  });
  if (error) return { error };
  redirect(withNotice(`/admin/marketing/templates?canal=${channel}`, "template-salvo"));
}

export async function deleteTemplate(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    // Regras que usavam o template passam a usar o padrão do canal.
    for (const r of db.rules) if (r.templateId === id) r.templateId = null;
    db.templates = db.templates.filter((t) => t.id !== id);
  });
  refresh();
}

export async function toggleTemplate(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    const t = db.templates.find((x) => x.id === id);
    if (!t) return;
    t.active = !t.active;
    if (!t.active) t.isDefault = false;
    t.updatedAt = new Date().toISOString();
  });
  refresh();
}

export async function setDefaultTemplate(formData: FormData) {
  await assertAdmin();
  const channel = channelOf(formData.get("canal"));
  const id = text(formData, "id");
  if (!channel) return;
  await updateDb((db) => {
    const target = db.templates.find((t) => t.id === id && t.channel === channel && t.active);
    // `id` vazio remove o padrão do canal.
    if (id && !target) return;
    for (const t of db.templates) if (t.channel === channel) t.isDefault = t.id === id;
  });
  refresh();
}

// ---------- Canais e regras ----------

export async function setChannelEnabled(formData: FormData) {
  await assertAdmin();
  const channel = channelOf(formData.get("canal"));
  if (!channel) return;
  const enabled = formData.get("ativo") === "true";
  await updateDb((db) => {
    db.marketing[channel] = {
      enabled,
      enabledSince: enabled ? new Date().toISOString() : db.marketing[channel].enabledSince,
    };
  });
  await runMarketing({ send: false });
  refresh();
}

export async function saveRule(_prev: MarketingFormState, formData: FormData): Promise<MarketingFormState> {
  await assertAdmin();
  const id = text(formData, "id");
  const channel = channelOf(formData.get("canal"));
  if (!channel) return { error: "Canal inválido." };
  const name = text(formData, "nome");
  const daysAfter = Number(text(formData, "dias"));
  const templateId = text(formData, "template") || null;
  const active = formData.get("ativo") === "on";

  if (name.length < 2 || name.length > LIMITS.name) return { error: `Dê um nome de 2 a ${LIMITS.name} caracteres.` };
  if (!Number.isInteger(daysAfter) || daysAfter < 1 || daysAfter > 365) {
    return { error: "Os dias de espera precisam ser um número inteiro de 1 a 365." };
  }

  const error = await updateDb((db) => {
    if (templateId && !db.templates.some((t) => t.id === templateId && t.channel === channel && t.active)) {
      return "Escolha um template ativo deste canal.";
    }
    const now = new Date().toISOString();
    const current = id ? db.rules.find((r) => r.id === id && r.channel === channel) : undefined;
    if (id && !current) return "Regra não encontrada.";
    if (current) {
      // Mudou o prazo ou foi religada: não age sobre ausências que já venceram.
      const restart = current.daysAfter !== daysAfter || (!current.active && active);
      Object.assign(current, { name, daysAfter, templateId, active, ...(restart && { activeSince: now }) });
    } else {
      db.rules.push({
        id: crypto.randomUUID(),
        channel,
        name,
        daysAfter,
        templateId,
        active,
        activeSince: now,
        createdAt: now,
      });
    }
    return null;
  });
  if (error) return { error };
  await runMarketing({ send: false });
  redirect(withNotice(paths[channel], "regra-salva"));
}

export async function toggleRule(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    const rule = db.rules.find((r) => r.id === id);
    if (!rule) return;
    rule.active = !rule.active;
    if (rule.active) rule.activeSince = new Date().toISOString();
  });
  await runMarketing({ send: false });
  refresh();
}

export async function deleteRule(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    db.rules = db.rules.filter((r) => r.id !== id);
  });
  await runMarketing({ send: false });
  refresh();
}

// ---------- Execução e histórico ----------

export type RunState = { result: RunResult | null; error: string | null };

export async function runNow(): Promise<RunState> {
  await assertAdmin();
  try {
    const result = await runMarketing();
    refresh();
    return { result, error: null };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Erro ao executar." };
  }
}

/** Volta um envio com falha para a fila; ele sai na próxima execução. */
export async function retryDispatch(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    const d = db.dispatches.find((x) => x.id === id && x.status === "falha");
    if (d) Object.assign(d, { status: "pendente", reason: undefined, updatedAt: new Date().toISOString() });
  });
  refresh();
}
