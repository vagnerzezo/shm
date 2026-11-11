"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  createSession,
  deleteSession,
  getCurrentUser,
  hashPassword,
  homeOf,
  loginHref,
  safeNext,
  verifyPassword,
} from "./auth";
import { nowInStudio, pickProfessional } from "./availability";
import { parseItems, toKeys, withItems } from "./booking";
import { readDb, updateDb } from "./db";
import { readProfile } from "./profile";
import { getBookableServices } from "./catalog";
import { addMessage, markConversationRead, markReadByCustomer } from "./chat";
import { sendBookingCancelledEmail, sendBookingConfirmedEmail, sendWelcomeEmail } from "./email-templates/send";
import { addReservations, getBookingBusy, getReservations, isPast, markCancelled } from "./reservations";
import { getAvailabilityRules } from "./schedule";

export type FormState = { error: string | null };
export type ProfileState = { error: string | null; saved: boolean };

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = readProfile(formData);
  if ("error" in profile) return profile;
  const password = String(formData.get("senha") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const passwordHash = await hashPassword(password);
  const userId = await updateDb((db) => {
    if (db.users.some((u) => u.email === profile.email)) return null;
    const id = crypto.randomUUID();
    db.users.push({ id, ...profile, passwordHash, createdAt: new Date().toISOString() });
    return id;
  });
  if (!userId) return { error: "Já existe uma conta com esse e-mail. Use a aba Entrar." };

  await createSession(userId);
  after(() => sendWelcomeEmail(userId));
  redirect(safeNext(formData.get("next"), homeOf(profile)));
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("senha") ?? "");
  const user = (await readDb()).users.find((u) => u.email === email);
  // Mesma mensagem nos dois casos, para não revelar quais e-mails têm conta.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }
  // Só depois da senha certa, para não revelar a situação de contas alheias.
  if (user.disabledAt) return { error: "Sua conta está desativada. Fale com o estúdio." };
  await createSession(user.id);
  redirect(safeNext(formData.get("next"), homeOf(user)));
}

export async function signOut() {
  await deleteSession();
  redirect("/");
}

export async function confirmBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const keys = toKeys(formData.getAll("item").map(String));
  const user = await getCurrentUser();
  if (!user) redirect(loginHref(withItems("/agendamento/confirmacao", keys)));

  // Revalida tudo no servidor: o horário pode ter passado ou conflitar com
  // uma reserva feita em outra aba.
  const busy = await getBookingBusy(user.id);
  const rules = await getAvailabilityRules();
  const items = parseItems(keys, nowInStudio(), busy, rules, await getBookableServices());
  if (items.length === 0 || items.length !== keys.length) {
    return { error: "Um dos horários não está mais disponível. Remova-o e escolha outro." };
  }

  const note = String(formData.get("observacao") ?? "").trim().slice(0, 300);
  const ids = await addReservations(
    items.map((i) => ({
      userId: user.id,
      serviceId: i.service.id,
      priceCents: i.service.priceCents,
      // parseItems já garantiu que há alguém livre; sem fixo, vai o livre com menos atendimentos no dia.
      professional: pickProfessional(i.service, i.date, i.time, busy, rules) ?? undefined,
      date: i.date,
      time: i.time,
      note: note || undefined,
    })),
  );
  after(() => sendBookingConfirmedEmail(user.id, ids));
  redirect(`/reservas?nova=${items.length}`);
}

export async function cancelReservation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(loginHref("/reservas"));
  const id = String(formData.get("id") ?? "");
  const target = (await getReservations(user.id)).find((r) => r.id === id);
  // Só dá para cancelar o que ainda não aconteceu.
  if (!target || isPast(target, nowInStudio())) return;
  if (!(await markCancelled(id, "cliente", { userId: user.id }))) redirect("/reservas");
  after(() => sendBookingCancelledEmail(user.id, target, { byStudio: false }));
  // Recarrega a lista (senão a reserva cancelada continua na tela) e tira o
  // "Reserva confirmada!" que pode ter ficado no endereço.
  redirect("/reservas");
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect(loginHref("/conta"));
  const profile = readProfile(formData);
  if ("error" in profile) return { error: profile.error, saved: false };

  const ok = await updateDb((db) => {
    if (db.users.some((u) => u.email === profile.email && u.id !== user.id)) return false;
    const current = db.users.find((u) => u.id === user.id);
    if (current) Object.assign(current, profile);
    return true;
  });
  if (!ok) return { error: "Esse e-mail já está em uso em outra conta.", saved: false };
  return { error: null, saved: true };
}

export type SendState = { error: string | null };

/** Admin responde a um cliente. O texto vem do campo `texto`. */
export async function sendMessage(customerId: string, formData: FormData): Promise<SendState> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Sem permissão para enviar mensagens." };
  const text = String(formData.get("texto") ?? "").trim().slice(0, 2000);
  if (!text) return { error: null };
  const ok = await addMessage(customerId, "admin", text);
  if (!ok) return { error: "Cliente não encontrado." };
  refresh();
  return { error: null };
}

/** Admin abriu a conversa: as mensagens do cliente deixam de contar como não lidas. */
export async function markConversationReadAction(customerId: string) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return;
  if ((await markConversationRead(customerId)) > 0) refresh();
}

/** Cliente escreve para o estúdio. O texto vem do campo `texto`. */
export async function sendCustomerMessage(formData: FormData): Promise<SendState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão expirou. Entre de novo para enviar." };
  if (user.role !== "cliente") return { error: "Use o chat do painel para responder clientes." };
  const text = String(formData.get("texto") ?? "").trim().slice(0, 2000);
  if (!text) return { error: null };
  await addMessage(user.id, "cliente", text);
  refresh();
  return { error: null };
}

/** Cliente abriu "Mensagens": as mensagens do estúdio deixam de contar como não lidas. */
export async function markCustomerReadAction() {
  const user = await getCurrentUser();
  if (user?.role !== "cliente") return;
  if ((await markReadByCustomer(user.id)) > 0) refresh();
}
