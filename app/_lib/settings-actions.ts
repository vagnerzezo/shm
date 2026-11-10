"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { addDays, nowInStudio, STEP_OPTIONS, toMinutes } from "./availability";
import { getCatalog } from "./catalog";
import { updateDb } from "./db";

export type SettingsState = { error: string | null; saved: boolean };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login?next=%2Fadmin%2Fconfiguracoes");
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function addClosure(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await assertAdmin();
  const start = text(formData, "inicio");
  const end = text(formData, "fim") || start;
  const professional = text(formData, "profissional");
  const reason = text(formData, "motivo");
  const today = nowInStudio().date;

  if (!DATE_RE.test(start) || !DATE_RE.test(end)) return { error: "Informe as datas de início e fim.", saved: false };
  if (end < start) return { error: "A data final precisa ser igual ou depois da inicial.", saved: false };
  if (end < today) return { error: "Esse período já passou.", saved: false };
  if (end > addDays(start, 365)) return { error: "O período pode ter no máximo um ano.", saved: false };
  if (professional && !(await getCatalog()).professionals.some((p) => p.name === professional)) return { error: "Profissional inválido.", saved: false };
  if (reason.length < 2 || reason.length > 60) return { error: "Escreva o motivo (até 60 caracteres).", saved: false };

  await updateDb((db) => {
    db.closures.push({
      id: crypto.randomUUID(),
      start,
      end,
      professional: professional || undefined,
      reason,
      createdAt: new Date().toISOString(),
    });
  });
  refresh();
  return { error: null, saved: true };
}

/** Remove o período: os dias voltam a aceitar agendamentos. */
export async function deleteClosure(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    db.closures = db.closures.filter((c) => c.id !== id);
  });
  refresh();
}

export async function saveSchedule(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await assertAdmin();
  const openWeekdays = [...new Set(formData.getAll("dia").map(Number))]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort();
  const openTime = text(formData, "abre");
  const lastStartTime = text(formData, "ultimo");
  const stepMinutes = Number(text(formData, "intervalo"));
  const maxDaysAhead = Number(text(formData, "janela"));
  const minNoticeHours = Number(text(formData, "antecedencia"));

  if (openWeekdays.length === 0) return { error: "Marque pelo menos um dia de atendimento.", saved: false };
  if (!TIME_RE.test(openTime) || !TIME_RE.test(lastStartTime)) return { error: "Informe os horários.", saved: false };
  if (toMinutes(lastStartTime) <= toMinutes(openTime)) {
    return { error: "O último horário de início precisa ser depois da abertura.", saved: false };
  }
  if (!STEP_OPTIONS.includes(stepMinutes)) return { error: "Intervalo inválido.", saved: false };
  if (!Number.isInteger(maxDaysAhead) || maxDaysAhead < 1 || maxDaysAhead > 365) {
    return { error: "A janela de agendamento precisa ser de 1 a 365 dias.", saved: false };
  }
  if (!Number.isInteger(minNoticeHours) || minNoticeHours < 0 || minNoticeHours > 72) {
    return { error: "A antecedência mínima precisa ser de 0 a 72 horas.", saved: false };
  }

  await updateDb((db) => {
    db.schedule = {
      openWeekdays,
      openTime,
      lastStartTime,
      stepMinutes,
      maxDaysAhead,
      minNoticeMinutes: minNoticeHours * 60,
    };
  });
  refresh();
  return { error: null, saved: true };
}

/** Nome, endereço e telefone do estúdio (sidebar e e-mails). */
export async function saveStudio(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await assertAdmin();
  const name = text(formData, "nome");
  const address = formData
    .getAll("endereco")
    .map((line) => String(line).trim())
    .filter(Boolean)
    .slice(0, 3);
  const phone = text(formData, "telefone").replace(/\D/g, "");

  if (name.length < 2 || name.length > 60) return { error: "Informe o nome do estúdio (até 60 caracteres).", saved: false };
  if (address.some((line) => line.length > 80)) return { error: "Cada linha do endereço pode ter até 80 caracteres.", saved: false };
  if (phone && (phone.length < 10 || phone.length > 11)) return { error: "Informe um telefone com DDD.", saved: false };

  await updateDb((db) => {
    db.studio = { name, address, phone };
  });
  refresh();
  return { error: null, saved: true };
}
