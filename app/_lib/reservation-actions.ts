"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { agendaHref } from "./agenda";
import { getCurrentUser } from "./auth";
import { formatLongDate, nowInStudio } from "./availability";
import { catalogOf } from "./catalog";
import { addMessage } from "./chat";
import { sendBookingCancelledEmail, sendBookingConfirmedEmail } from "./email-templates/send";
import { readDb, type Attendance } from "./db";
import { withNotice } from "./notices";
import { setAttendanceFor } from "./domain/barber";
import { bookByAdmin, rescheduleByAdmin } from "./domain/bookings";
import { messageOf } from "./errors";
import { isPast, markCancelled } from "./reservations";
import { findService } from "./services";

// Reservas gerenciadas pelo estúdio. O cliente tem as próprias ações em `actions.ts`.

export type ReservationFormState = { error: string | null };

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login?next=%2Fadmin%2Fagenda");
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

  let id: string;
  try {
    id = await bookByAdmin({ customerId, serviceId, date, time, note: text(formData, "observacao") });
  } catch (error) {
    return { error: messageOf(error) };
  }
  if (formData.get("avisar") === "on") {
    const db = await readDb();
    const customer = db.users.find((u) => u.id === customerId);
    const service = findService(catalogOf(db).services, serviceId);
    await addMessage(
      customerId,
      "admin",
      `Olá, ${customer?.name.split(" ")[0] ?? ""}! Marcamos ${service?.name ?? "seu horário"} para ${formatLongDate(date)} às ${time}. Até lá!`,
    );
    after(() => sendBookingConfirmedEmail(customerId, [id]));
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

  let before;
  try {
    before = await rescheduleByAdmin(id, date, time);
  } catch (error) {
    return { error: messageOf(error) };
  }
  if (formData.get("avisar") === "on") {
    const service = findService(catalogOf(await readDb()).services, before.serviceId);
    await addMessage(
      before.userId,
      "admin",
      `Seu horário de ${service?.name ?? "atendimento"} mudou: de ${formatLongDate(before.date)} às ${before.time} para ${formatLongDate(date)} às ${time}.`,
    );
  }
  redirect(withNotice(agendaHref("dia", date, id), "reserva-remarcada"));
}

export async function cancelReservationByAdmin(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  const reason = text(formData, "motivo").slice(0, 200);

  const db = await readDb();
  const target = await markCancelled(id, "admin", { reason });
  if (!target) return;

  const upcoming = !isPast(target, nowInStudio());
  if (upcoming && formData.get("avisar") === "on") {
    const service = findService(catalogOf(db).services, target.serviceId);
    await addMessage(
      target.userId,
      "admin",
      `Seu horário de ${service?.name ?? "atendimento"} em ${formatLongDate(target.date)} às ${target.time} foi cancelado pelo estúdio.${reason ? ` Motivo: ${reason}.` : ""} Se quiser, marque um novo horário pelo site ou responda por aqui.`,
    );
    after(() => sendBookingCancelledEmail(target.userId, target, { byStudio: true, reason: reason || undefined }));
  }
  redirect(withNotice(agendaHref("dia", target.date), "reserva-cancelada"));
}

/** Compareceu / faltou. Vazio volta para "não marcado" (conta como compareceu). */
export async function setAttendance(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  const raw = text(formData, "situacao");
  const attendance: Attendance | null = raw === "faltou" || raw === "compareceu" ? raw : null;
  // Reserva cancelada, futura ou inexistente: nada muda (a tela nem oferece o botão).
  await setAttendanceFor({ role: "admin" }, id, attendance).catch(messageOf);
  refresh();
}
