"use server";

import { currentToken, getCurrentUser } from "../auth";
import { pushEnabled } from "./dispatch";
import { deletePushSubscription, hasPushSubscription, savePushSubscription, type PushKeys } from "./subscriptions";

// Ligar e desligar os avisos no celular deste aparelho. Só equipe (barbeiro e
// admin); o cliente não recebe avisos no celular.

async function staff() {
  const user = await getCurrentUser();
  const token = await currentToken();
  if (!user || !token || user.role === "cliente") return null;
  return { user, token };
}

function isPushKeys(v: unknown): v is PushKeys {
  if (!v || typeof v !== "object") return false;
  const { endpoint, keys } = v as Partial<PushKeys>;
  if (typeof endpoint !== "string" || endpoint.length > 2048 || !endpoint.startsWith("https://")) return false;
  return Boolean(keys && typeof keys.p256dh === "string" && typeof keys.auth === "string" && keys.p256dh && keys.auth);
}

export async function subscribePush(sub: unknown): Promise<{ ok: true } | { error: string }> {
  const me = await staff();
  if (!me) return { error: "Só a equipe do estúdio recebe avisos no celular." };
  if (!pushEnabled()) return { error: "Os avisos no celular ainda não estão disponíveis." };
  if (!isPushKeys(sub)) return { error: "Não foi possível ligar os avisos neste aparelho." };
  await savePushSubscription(me.token, me.user.id, {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return { ok: true };
}

export async function unsubscribePush(endpoint: unknown): Promise<void> {
  const me = await staff();
  if (!me || typeof endpoint !== "string") return;
  await deletePushSubscription(endpoint, me.user.id);
}

export async function pushSubscriptionStatus(endpoint: unknown): Promise<boolean> {
  const me = await staff();
  if (!me || typeof endpoint !== "string") return false;
  return hasPushSubscription(me.token, endpoint);
}
