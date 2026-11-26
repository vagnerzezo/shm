import { sendNotification } from "web-push";
import { orm, pendingPush, type Notification } from "../db";
import { users as usersTable } from "../db-schema";
import { hrefOf, isForUser } from "../notifications";
import { toCustomer, type Customer } from "../roles";
import { activePushSubscriptions, deletePushSubscription, type PushKeys } from "./subscriptions";

// Avisos no celular: depois que o updateDb grava, ele agenda (after) o envio
// dos avisos de reserva novos para cá. Quem recebe segue a regra do sino
// (isForUser); o envio nunca derruba a ação.

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

/** Serviços de push dos navegadores (Chrome/Edge, Firefox, Windows, Safari). */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /(^|\.)push\.apple\.com$/];

/** O endereço é de um serviço de push conhecido? Evita o servidor mandar pedidos para qualquer lugar. */
export function isPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return url.protocol === "https:" && !url.port && PUSH_HOSTS.some((h) => h.test(url.hostname));
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
    // Serviço de push travado não segura a função até o limite da Vercel.
    timeout: 10_000,
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

/** Envia os avisos de reserva aos aparelhos de quem deve saber. Chamado pelo updateDb (via after). Sem chaves, não faz nada. */
export async function sendPush(notices: Notification[]): Promise<void> {
  if (!pushEnabled() || !notices.some((n) => TITLES[n.kind])) return;
  // Só as colunas que decidem quem recebe, sem carregar o banco inteiro. Todos os
  // usuários: ADMIN_EMAILS faz admin quem não tem papel gravado.
  const rows = await orm
    .select({
      id: usersTable.id,
      name: usersTable.name,
      phone: usersTable.phone,
      email: usersTable.email,
      role: usersTable.role,
      professional: usersTable.professional,
      disabledAt: usersTable.disabledAt,
    })
    .from(usersTable);
  const users = rows.map((u) => ({
    ...toCustomer({ ...u, role: (u.role ?? undefined) as Customer["role"] | undefined, consent: undefined, professional: u.professional ?? undefined }),
    disabledAt: u.disabledAt ? u.disabledAt.toISOString() : undefined,
  }));
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

/** Testes: espera os envios agendados terminarem. */
export async function waitForPush(): Promise<void> {
  await pendingPush();
}
