"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  createSession,
  deleteSession,
  getCurrentUser,
  homeOf,
  loginHref,
  safeNext,
} from "./auth";
import { toKeys, withItems } from "./booking";
import { clientIp } from "./client-ip";
import { authenticate, registerCustomer, updateOwnProfile } from "./domain/account";
import { bookForCustomer, cancelForCustomer } from "./domain/bookings";
import { canOpen, scopeOf } from "./access";
import { getCustomer } from "./customers";
import { messageText } from "./domain/messages";
import { markBellSeen } from "./notifications";
import { DomainError, messageOf } from "./errors";
import { profileInputOf } from "./profile";
import { addMessage, markConversationRead, markReadByCustomer } from "./chat";
import { sendBookingCancelledEmail, sendBookingConfirmedEmail, sendWelcomeEmail } from "./email-templates/send";

export type FormState = { error: string | null };
export type ProfileState = { error: string | null; saved: boolean };

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await registerCustomer(
      profileInputOf(formData),
      String(formData.get("senha") ?? ""),
      clientIp(await headers()),
    );
  } catch (error) {
    if (error instanceof DomainError && error.code === "email_taken") {
      return { error: "Já existe uma conta com esse e-mail. Use a aba Entrar." };
    }
    return { error: messageOf(error) };
  }
  const userId = user.id;
  await createSession(userId);
  after(() => sendWelcomeEmail(userId));
  redirect(safeNext(formData.get("next"), homeOf(user)));
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await authenticate(String(formData.get("email") ?? ""), String(formData.get("senha") ?? ""));
  } catch (error) {
    return { error: messageOf(error) };
  }
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

  // A regra confere tudo de novo na hora de gravar: o horário pode ter passado
  // ou sido ocupado em outra aba ou por outra pessoa.
  const items = keys.map((key) => {
    const [serviceId, date, time] = key.split("_");
    return { serviceId, date, time };
  });
  let ids: string[];
  try {
    ids = await bookForCustomer(user.id, items, formData.get("observacao"));
  } catch (error) {
    if (error instanceof DomainError && error.code === "validation") {
      return { error: "Um dos horários não está mais disponível. Remova-o e escolha outro." };
    }
    return { error: messageOf(error) };
  }
  after(() => sendBookingConfirmedEmail(user.id, ids));
  redirect(`/reservas?nova=${ids.length}`);
}

export async function cancelReservation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(loginHref("/reservas"));
  const id = String(formData.get("id") ?? "");
  let target;
  try {
    target = await cancelForCustomer(user.id, id);
  } catch (error) {
    // Reserva que não existe mais ou já passou: só recarrega a lista.
    messageOf(error);
    redirect("/reservas");
  }
  after(() => sendBookingCancelledEmail(user.id, target, { byStudio: false }));
  // Recarrega a lista (senão a reserva cancelada continua na tela) e tira o
  // "Reserva confirmada!" que pode ter ficado no endereço.
  redirect("/reservas");
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect(loginHref("/conta"));
  try {
    await updateOwnProfile(user.id, profileInputOf(formData));
  } catch (error) {
    return { error: messageOf(error), saved: false };
  }
  // O formulário volta aos valores da página depois de salvar; sem recarregar, mostraria os antigos.
  refresh();
  return { error: null, saved: true };
}

export type SendState = { error: string | null };

/** Texto do campo `texto` pela regra do chat, ou o estado a devolver (vazio não faz nada; acima do limite avisa). */
function chatText(formData: FormData): string | SendState {
  const raw = String(formData.get("texto") ?? "");
  if (!raw.trim()) return { error: null };
  try {
    return messageText(raw);
  } catch (error) {
    return { error: messageOf(error) };
  }
}

/** Equipe responde a um cliente (barbeiro: só os dele). O texto vem do campo `texto`; a mensagem guarda quem escreveu. */
export async function sendMessage(customerId: string, formData: FormData): Promise<SendState> {
  const user = await getCurrentUser();
  if (!user || !canOpen(user, "chat")) return { error: "Sem permissão para enviar mensagens." };
  if (!(await getCustomer(customerId, scopeOf(user)))) return { error: "Cliente não encontrado." };
  const text = chatText(formData);
  if (typeof text !== "string") return text;
  const ok = await addMessage(customerId, "admin", text, user.id);
  if (!ok) return { error: "Cliente não encontrado." };
  refresh();
  return { error: null };
}

/** Admin abriu a conversa: as mensagens do cliente deixam de contar como não lidas. */
export async function markConversationReadAction(customerId: string) {
  const user = await getCurrentUser();
  if (!user || !canOpen(user, "chat")) return;
  if (!(await getCustomer(customerId, scopeOf(user)))) return;
  if ((await markConversationRead(customerId)) > 0) refresh();
}

/** Cliente escreve para o estúdio. O texto vem do campo `texto`. */
export async function sendCustomerMessage(formData: FormData): Promise<SendState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão expirou. Entre de novo para enviar." };
  if (user.role !== "cliente") return { error: "Use o chat do painel para responder clientes." };
  const text = chatText(formData);
  if (typeof text !== "string") return text;
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

/** Abriu o sino: tudo o que chegou até agora passa a ser visto. */
export async function markBellSeenAction() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "barbeiro")) return;
  await markBellSeen(user.id);
}
