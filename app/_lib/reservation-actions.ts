"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { agendaHref } from "./agenda";
import { getCurrentUser, roleOf } from "./auth";
import { formatLongDate, isClosed, nowInStudio } from "./availability";
import { catalogOf } from "./catalog";
import { addMessage } from "./chat";
import { readDb, updateDb, type Attendance } from "./db";
import { withNotice } from "./notices";
import { findConflict, isPast } from "./reservations";
import { getAvailabilityRules } from "./schedule";
import { findService } from "./services";

// Reservas gerenciadas pelo estúdio. O cliente tem as próprias ações em `actions.ts`.

export type ReservationFormState = { error: string | null };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login?next=%2Fadmin%2Fagenda");
}

/** Valida dia e horário de uma reserva (nova ou remarcada). Devolve a mensagem de erro, se houver. */
async function checkSlot(serviceId: string, date: string, time: string, ignoreId?: string) {
  if (!DATE_RE.test(date)) return "Escolha a data.";
  if (!TIME_RE.test(time)) return "Escolha o horário.";
  const db = await readDb();
  const { services } = catalogOf(db);
  const service = findService(services, serviceId);
  if (!service) return "Serviço não encontrado.";
  const rules = await getAvailabilityRules();
  if (isClosed(date, rules, service.professional)) {
    return `A agenda está fechada nesse dia${service.professional ? ` para ${service.professional}` : ""}. Reabra o período em Configurações se precisar.`;
  }
  const conflict = findConflict(db.reservations, services, { serviceId, date, time, ignoreId });
  if (conflict) {
    const who = db.users.find((u) => u.id === conflict.userId)?.name ?? "outro cliente";
    return `Esse horário bate com a reserva de ${who} às ${conflict.time}${service.professional ? ` com ${service.professional}` : ""}.`;
  }
  return null;
}

export async function createReservationByAdmin(
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  await assertAdmin();
  const customerId = text(formData, "cliente");
  const serviceId = text(formData, "servico");
  const date = text(formData, "data");
  const time = text(formData, "hora");
  const note = text(formData, "observacao").slice(0, 300);

  const db = await readDb();
  const customer = db.users.find((u) => u.id === customerId && roleOf(u) === "cliente");
  if (!customer) return { error: "Escolha o cliente." };
  if (customer.disabledAt) return { error: "Esse cliente está desativado. Reative a conta antes de marcar." };
  const service = findService(catalogOf(db).services, serviceId);
  if (!service || service.active === false) return { error: "Escolha um serviço ativo." };

  const error = await checkSlot(serviceId, date, time);
  if (error) return { error };

  const id = crypto.randomUUID();
  await updateDb((db) => {
    db.reservations.push({
      id,
      userId: customerId,
      serviceId,
      priceCents: service.priceCents,
      date,
      time,
      note: note || undefined,
      createdBy: "admin",
    });
  });
  if (formData.get("avisar") === "on") {
    await addMessage(
      customerId,
      "admin",
      `Olá, ${customer.name.split(" ")[0]}! Marcamos ${service.name} para ${formatLongDate(date)} às ${time}. Até lá!`,
    );
  }
  redirect(withNotice(agendaHref("dia", date, id), "reserva-criada"));
}

export async function rescheduleReservation(
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  await assertAdmin();
  const id = text(formData, "id");
  const date = text(formData, "data");
  const time = text(formData, "hora");

  const db = await readDb();
  const current = db.reservations.find((r) => r.id === id);
  if (!current) return { error: "Reserva não encontrada." };
  if (isPast(current, nowInStudio())) return { error: "Esse horário já passou e não pode ser remarcado." };
  if (current.date === date && current.time === time) return { error: "Escolha um dia ou horário diferente." };

  const error = await checkSlot(current.serviceId, date, time, id);
  if (error) return { error };

  await updateDb((db) => {
    const r = db.reservations.find((r) => r.id === id);
    if (r) Object.assign(r, { date, time });
  });
  if (formData.get("avisar") === "on") {
    const service = findService(catalogOf(db).services, current.serviceId);
    await addMessage(
      current.userId,
      "admin",
      `Seu horário de ${service?.name ?? "atendimento"} mudou: de ${formatLongDate(current.date)} às ${current.time} para ${formatLongDate(date)} às ${time}.`,
    );
  }
  redirect(withNotice(agendaHref("dia", date, id), "reserva-remarcada"));
}

export async function cancelReservationByAdmin(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  const reason = text(formData, "motivo").slice(0, 200);

  const db = await readDb();
  const target = db.reservations.find((r) => r.id === id);
  if (!target) return;
  await updateDb((db) => {
    db.reservations = db.reservations.filter((r) => r.id !== id);
  });

  const upcoming = !isPast(target, nowInStudio());
  if (upcoming && formData.get("avisar") === "on") {
    const service = findService(catalogOf(db).services, target.serviceId);
    await addMessage(
      target.userId,
      "admin",
      `Seu horário de ${service?.name ?? "atendimento"} em ${formatLongDate(target.date)} às ${target.time} foi cancelado pelo estúdio.${reason ? ` Motivo: ${reason}.` : ""} Se quiser, marque um novo horário pelo site ou responda por aqui.`,
    );
  }
  redirect(withNotice(agendaHref("dia", target.date), "reserva-cancelada"));
}

/** Compareceu / faltou. Vazio volta para "não marcado" (conta como compareceu). */
export async function setAttendance(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  const raw = text(formData, "situacao");
  const attendance: Attendance | undefined = raw === "faltou" || raw === "compareceu" ? raw : undefined;
  const now = nowInStudio();
  await updateDb((db) => {
    const r = db.reservations.find((r) => r.id === id);
    // Só depois do horário dá para saber se o cliente veio.
    if (!r || !isPast(r, now)) return;
    if (attendance) r.attendance = attendance;
    else delete r.attendance;
  });
  refresh();
}
