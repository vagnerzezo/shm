"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession, getCurrentUser, hashPassword, homeOf, loginHref, verifyPassword } from "./auth";
import { formatLongDate, getSlots, nowInStudio } from "./availability";
import { getBookableServices } from "./catalog";
import { addMessage } from "./chat";
import { purgeUser, readDb, updateDb } from "./db";
import { withNotice } from "./notices";
import { completePasswordReset, startPasswordReset } from "./password-reset";
import { getBookingBusy, isCancelled, isPast, keepOrPick } from "./reservations";
import { getAvailabilityRules } from "./schedule";
import { findService } from "./services";
import { unsubscribeByToken } from "./unsubscribe";

export type AccountState = { error: string | null; saved: boolean };

const PASSWORD_RULE = "A senha precisa ter de 8 a 100 caracteres.";
const validPassword = (p: string) => p.length >= 8 && p.length <= 100;

/** "Esqueci minha senha". Sempre responde igual, para não revelar quais e-mails têm conta. */
export async function requestPasswordReset(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Informe um e-mail válido.", saved: false };
  await startPasswordReset(email);
  return { error: null, saved: true };
}

/** Nova senha pelo link do e-mail. Encerra as outras sessões e já entra na conta. */
export async function resetPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("senha") ?? "");
  if (!validPassword(password)) return { error: PASSWORD_RULE, saved: false };
  if (password !== String(formData.get("confirmacao") ?? "")) {
    return { error: "As duas senhas não são iguais.", saved: false };
  }
  const user = await completePasswordReset(token, await hashPassword(password));
  if (!user) return { error: "Este link expirou ou já foi usado. Peça um novo.", saved: false };
  await createSession(user.id);
  redirect(withNotice(homeOf(user), "senha-redefinida"));
}

/** Troca a própria senha (cliente ou admin). Encerra as outras sessões e mantém esta aberta. */
export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const me = await getCurrentUser();
  if (!me) redirect(loginHref("/conta"));
  const current = String(formData.get("atual") ?? "");
  const password = String(formData.get("senha") ?? "");

  const user = (await readDb()).users.find((u) => u.id === me.id);
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "A senha atual está incorreta.", saved: false };
  }
  if (!validPassword(password)) return { error: PASSWORD_RULE, saved: false };
  if (password !== String(formData.get("confirmacao") ?? "")) {
    return { error: "As duas senhas novas não são iguais.", saved: false };
  }
  if (password === current) return { error: "A nova senha precisa ser diferente da atual.", saved: false };

  const passwordHash = await hashPassword(password);
  await updateDb((db) => {
    const u = db.users.find((u) => u.id === me.id);
    if (u) u.passwordHash = passwordHash;
    db.sessions = db.sessions.filter((s) => s.userId !== me.id);
  });
  await createSession(me.id);
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
  const user = (await readDb()).users.find((u) => u.id === me.id);
  if (!user || !(await verifyPassword(String(formData.get("senha") ?? ""), user.passwordHash))) {
    return { error: "Senha incorreta.", saved: false };
  }
  await updateDb((db) => purgeUser(db, me.id));
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
