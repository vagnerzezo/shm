"use server";

import { redirect } from "next/navigation";
import { createSession, currentToken, deleteSession, getCurrentUser, homeOf, loginHref } from "./auth";
import { formatLongDate, getSlots, nowInStudio } from "./availability";
import { getBookableServices } from "./catalog";
import { addMessage } from "./chat";
import { readDb, updateDb } from "./db";
import {
  assertCurrentPassword,
  changeOwnPassword,
  deleteOwnAccount as deleteAccount,
  requestPasswordResetFor,
  resetPasswordWithToken,
} from "./domain/account";
import { messageOf } from "./errors";
import { withNotice } from "./notices";
import { getBookingBusy, isCancelled, isPast, keepOrPick } from "./reservations";
import { getAvailabilityRules } from "./schedule";
import { findService } from "./services";
import { unsubscribeByToken } from "./unsubscribe";

export type AccountState = { error: string | null; saved: boolean };

/** "Esqueci minha senha". Sempre responde igual, para não revelar quais e-mails têm conta. */
export async function requestPasswordReset(_prev: AccountState, formData: FormData): Promise<AccountState> {
  try {
    await requestPasswordResetFor(formData.get("email"));
  } catch (error) {
    return { error: messageOf(error), saved: false };
  }
  return { error: null, saved: true };
}

/** Nova senha pelo link do e-mail. Encerra as outras sessões e já entra na conta. */
export async function resetPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const password = String(formData.get("senha") ?? "");
  if (password.length >= 8 && password.length <= 100 && password !== String(formData.get("confirmacao") ?? "")) {
    return { error: "As duas senhas não são iguais.", saved: false };
  }
  let user;
  try {
    user = await resetPasswordWithToken(String(formData.get("token") ?? ""), password);
  } catch (error) {
    return { error: messageOf(error), saved: false };
  }
  await createSession(user.id);
  redirect(withNotice(homeOf(user), "senha-redefinida"));
}

/** Troca a própria senha (cliente ou admin). Encerra as outras sessões e mantém esta aberta. */
export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const me = await getCurrentUser();
  if (!me) redirect(loginHref("/conta"));
  const current = String(formData.get("atual") ?? "");
  const password = String(formData.get("senha") ?? "");
  const confirmation = String(formData.get("confirmacao") ?? "");
  try {
    // A confirmação só existe no formulário; conferida depois da senha atual e do tamanho, como antes.
    if (password.length >= 8 && password.length <= 100 && password !== confirmation) {
      await assertCurrentPassword(me.id, current);
      return { error: "As duas senhas novas não são iguais.", saved: false };
    }
    await changeOwnPassword(me.id, current, password, await currentToken());
  } catch (error) {
    return { error: messageOf(error), saved: false };
  }
  return { error: null, saved: true };
}

/** Cliente apaga a própria conta e todos os dados (LGPD). Pede a senha e a palavra EXCLUIR. */
export async function deleteOwnAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const me = await getCurrentUser();
  if (!me) redirect(loginHref("/conta"));
  if (me.role !== "cliente") return { error: "A conta de administrador não pode ser excluída por aqui.", saved: false };
  if (String(formData.get("confirmacao") ?? "").trim().toUpperCase() !== "EXCLUIR") {
    return { error: "Digite EXCLUIR para confirmar.", saved: false };
  }
  try {
    await deleteAccount(me.id, String(formData.get("senha") ?? ""));
  } catch (error) {
    return { error: messageOf(error), saved: false };
  }
  await deleteSession();
  redirect(withNotice("/", "conta-excluida"));
}

export type RescheduleState = { error: string | null };

/** Cliente troca o dia/horário de uma reserva futura e o estúdio é avisado pelo chat. */
export async function rescheduleMyReservation(_prev: RescheduleState, formData: FormData): Promise<RescheduleState> {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("data") ?? "");
  const time = String(formData.get("hora") ?? "");
  const me = await getCurrentUser();
  if (!me) redirect(loginHref(`/reservas/${id}/remarcar`));

  const current = (await readDb()).reservations.find((r) => r.id === id && r.userId === me.id);
  const now = nowInStudio();
  if (!current || isCancelled(current)) return { error: "Reserva não encontrada." };
  if (isPast(current, now)) return { error: "Esse horário já passou e não pode ser remarcado." };
  if (current.date === date && current.time === time) return { error: "Escolha um dia ou horário diferente." };

  const service = findService(await getBookableServices(), current.serviceId);
  if (!service) return { error: "Esse serviço não está mais disponível para remarcar. Fale com o estúdio." };
  // Revalida no servidor: o horário pode ter sido ocupado depois que a tela abriu.
  const busy = await getBookingBusy(me.id, id);
  const rules = await getAvailabilityRules();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !getSlots(service, date, now, busy, rules).includes(time)) {
    return { error: "Esse horário não está mais disponível. Escolha outro." };
  }
  const professional = keepOrPick(current.professional, service, date, time, busy, rules);

  const moved = await updateDb((db) => {
    const r = db.reservations.find((r) => r.id === id && r.userId === me.id);
    if (!r || isCancelled(r) || r.date !== current.date || r.time !== current.time) return false;
    Object.assign(r, { date, time, professional });
    return true;
  });
  if (!moved) return { error: "A reserva mudou enquanto você escolhia. Abra de novo e tente outra vez." };

  await addMessage(
    me.id,
    "cliente",
    `Remarquei ${service.name}: de ${formatLongDate(current.date)} às ${current.time} para ${formatLongDate(date)} às ${time}.`,
  );
  redirect(withNotice("/reservas", "reserva-remarcada"));
}

/** Botão da tela de descadastro (o link do e-mail só abre a tela; quem desliga é o clique). */
export async function unsubscribe(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  const ok = await unsubscribeByToken(token);
  redirect(`/descadastrar?t=${encodeURIComponent(token)}&feito=${ok ? 1 : 0}`);
}
