import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { orm } from "../app/_lib/db";
import { sessions } from "../app/_lib/db-schema";
import { deleteCustomerByAdmin } from "../app/_lib/domain/account";
import {
  activePushSubscriptions,
  deletePushSubscription,
  hasPushSubscription,
  savePushSubscription,
  type PushKeys,
} from "../app/_lib/push/subscriptions";
import { createSessionToken, hashToken, revokeSession, revokeUserSessions } from "../app/_lib/sessions";
import { resetTestDb } from "../scripts/test-reset";
import { USERS } from "./fixtures";

// Avisos no celular (PWA parte B). Usa o banco de teste.

const sub = (n = 1): PushKeys => ({
  endpoint: `https://push.example.test/sub/${n}`,
  keys: { p256dh: `p256dh-${n}`, auth: `auth-${n}` },
});
const heitor = USERS.heitor.id;
const cliente = USERS.cliente.id;

describe("inscrições de aparelhos", () => {
  beforeEach(resetTestDb);

  test("inscrição salva e encontrada pela sessão", async () => {
    const { token } = await createSessionToken(heitor);
    const { token: other } = await createSessionToken(heitor);
    await savePushSubscription(token, heitor, sub());
    assert.equal(await hasPushSubscription(token, sub().endpoint), true);
    assert.equal(await hasPushSubscription(other, sub().endpoint), false);
  });

  test("mesmo endpoint com outra conta substitui", async () => {
    const { token: a } = await createSessionToken(cliente);
    const { token: h } = await createSessionToken(heitor);
    await savePushSubscription(a, cliente, sub());
    await savePushSubscription(h, heitor, sub());
    assert.equal((await activePushSubscriptions([cliente])).length, 0);
    assert.equal((await activePushSubscriptions([heitor])).length, 1);
  });

  test("sair apaga a inscrição", async () => {
    const { token } = await createSessionToken(heitor);
    await savePushSubscription(token, heitor, sub());
    await revokeSession(token);
    assert.equal((await activePushSubscriptions([heitor])).length, 0);
  });

  test("trocar senha / desativar apaga", async () => {
    const { token } = await createSessionToken(heitor);
    await savePushSubscription(token, heitor, sub());
    await revokeUserSessions(heitor);
    assert.equal((await activePushSubscriptions([heitor])).length, 0);
  });

  test("sessão vencida não recebe", async () => {
    const { token } = await createSessionToken(heitor);
    await savePushSubscription(token, heitor, sub());
    await orm.update(sessions).set({ expiresAt: Date.now() - 1000 }).where(eq(sessions.token, hashToken(token)));
    assert.equal((await activePushSubscriptions([heitor])).length, 0);
  });

  test("excluir a conta apaga", async () => {
    const { token } = await createSessionToken(cliente);
    await savePushSubscription(token, cliente, sub());
    assert.equal(await deleteCustomerByAdmin(cliente, USERS.admin.id), true);
    assert.equal((await activePushSubscriptions([cliente])).length, 0);
  });

  test("deletePushSubscription com outro userId não apaga", async () => {
    const { token } = await createSessionToken(heitor);
    await savePushSubscription(token, heitor, sub());
    await deletePushSubscription(sub().endpoint, cliente);
    assert.equal((await activePushSubscriptions([heitor])).length, 1);
    await deletePushSubscription(sub().endpoint, heitor);
    assert.equal((await activePushSubscriptions([heitor])).length, 0);
  });
});
