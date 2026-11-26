import { after } from "next/server";
import { sendNotification } from "web-push";
import { pendingPush, readDb, type Notification } from "../db";
import { hrefOf, isForUser } from "../notifications";
import { toCustomer, type Customer } from "../roles";
import { activePushSubscriptions, deletePushSubscription, type PushKeys } from "./subscriptions";

// Avisos no celular: depois que o updateDb grava, os avisos de reserva novos
// chegam aqui. Quem recebe segue a regra do sino (isForUser); o envio roda
// depois da resposta (after) e nunca derruba a ação.

export type PushPayload = { title: string; body: string; url: string; tag: string };
export type PushMessage = { userId: string; payload: PushPayload };
export type PushSender = (sub: PushKeys, payload: string) => Promise<{ statusCode: number }>;

const TITLES: Partial<Record<Notification["kind"], string>> = {
  reserva_marcada: "Nova marcação",
  reserva_remarcada: "Remarcação",
  reserva_cancelada: "Cancelamento",
};

/** Um envio por pessoa e reserva; só os três avisos de reserva; só quem o sino também avisaria. */
export function pushMessagesFor(notices: Notification[], users: (Customer & { disabledAt?: string })[]): PushMessage[] {
  const seen = new Set<string>();
  const out: PushMessage[] = [];
  for (const n of notices) {
    const title = TITLES[n.kind];
    if (!title) continue;
    for (const user of users) {
      if (user.disabledAt || user.role === "cliente" || !isForUser(n, user)) continue;
      const key = `${user.id}|${n.reservationId ?? n.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ userId: user.id, payload: { title, body: n.text, url: hrefOf(n), tag: `reserva-${n.reservationId ?? n.id}` } });
    }
  }
  return out;
}

export function pushEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

/** Opções do envio. Urgência alta: o Android não segura o aviso com o celular parado (Doze). */
export function pushSendOptions() {
  return {
    TTL: 86_400,
    urgency: "high" as const,
    vapidDetails: {
      subject: process.env.VAPID_SUBJECT!,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY!,
    },
  };
}

const realSender: PushSender = (sub, payload) => sendNotification(sub, payload, pushSendOptions());

let sender: PushSender = realSender;
/** Testes trocam o envio real; `null` volta ao web-push. */
export function setPushSender(fake: PushSender | null): void {
  sender = fake ?? realSender;
}

const running = new Set<Promise<void>>();

async function send(notices: Notification[]): Promise<void> {
  const db = await readDb();
  const users = db.users.map((u) => ({ ...toCustomer(u), disabledAt: u.disabledAt }));
  const messages = pushMessagesFor(notices, users);
  if (messages.length === 0) return;
  const subs = await activePushSubscriptions([...new Set(messages.map((m) => m.userId))]);
  const jobs = messages.flatMap((m) =>
    subs
      .filter((s) => s.userId === m.userId)
      .map(async (s) => {
        try {
          await sender({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(m.payload));
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // Aparelho que desinstalou ou cuja inscrição venceu: sai da lista.
          if (status === 404 || status === 410) await deletePushSubscription(s.endpoint);
          else console.error("Falha ao enviar aviso ao celular:", e);
        }
      }),
  );
  await Promise.allSettled(jobs);
}

/** Chamado pelo updateDb depois de gravar. Sem chaves configuradas, não faz nada. */
export function dispatchPush(notices: Notification[]): void {
  if (!pushEnabled() || !notices.some((n) => TITLES[n.kind])) return;
  const task = () => {
    const p = send(notices).catch((e) => console.error("Falha ao preparar avisos ao celular:", e));
    running.add(p);
    void p.finally(() => running.delete(p));
    return p;
  };
  try {
    after(task);
  } catch {
    // Fora de uma requisição (scripts, testes): roda na hora.
    void task();
  }
}

/** Testes: espera os envios agendados terminarem. */
export async function waitForPush(): Promise<void> {
  await pendingPush();
  await Promise.allSettled([...running]);
}
