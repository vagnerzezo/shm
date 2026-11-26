import { and, eq, gt, inArray } from "drizzle-orm";
import { orm } from "../db";
import { pushSubscriptions, sessions } from "../db-schema";
import { hashToken } from "../sessions";

// Aparelhos inscritos nos avisos no celular. Consultas diretas, como as
// sessões: a inscrição é apagada em cascata junto com a sessão dela.

export type PushKeys = { endpoint: string; keys: { p256dh: string; auth: string } };
export type StoredPushSubscription = PushKeys & { userId: string };

/** Guarda a inscrição deste aparelho na sessão atual. O mesmo aparelho inscrito de novo substitui a anterior. */
export async function savePushSubscription(sessionToken: string, userId: string, sub: PushKeys): Promise<void> {
  const row = {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userId,
    sessionToken: hashToken(sessionToken),
    createdAt: new Date(),
  };
  await orm
    .insert(pushSubscriptions)
    .values(row)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { ...row } });
}

/** Apaga a inscrição do aparelho. Com `userId`, só se for dessa pessoa. */
export async function deletePushSubscription(endpoint: string, userId?: string): Promise<void> {
  const byEndpoint = eq(pushSubscriptions.endpoint, endpoint);
  await orm.delete(pushSubscriptions).where(userId ? and(byEndpoint, eq(pushSubscriptions.userId, userId)) : byEndpoint);
}

/** O aparelho está inscrito nesta sessão? */
export async function hasPushSubscription(sessionToken: string, endpoint: string): Promise<boolean> {
  const rows = await orm
    .select({ endpoint: pushSubscriptions.endpoint })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.sessionToken, hashToken(sessionToken))));
  return rows.length > 0;
}

/** Inscrições dessas pessoas cuja sessão ainda vale (sessão vencida não é apagada na hora). */
export async function activePushSubscriptions(userIds: string[]): Promise<StoredPushSubscription[]> {
  if (userIds.length === 0) return [];
  const rows = await orm
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      userId: pushSubscriptions.userId,
    })
    .from(pushSubscriptions)
    .innerJoin(sessions, eq(sessions.token, pushSubscriptions.sessionToken))
    .where(and(inArray(pushSubscriptions.userId, userIds), gt(sessions.expiresAt, Date.now())));
  return rows.map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth }, userId: r.userId }));
}
