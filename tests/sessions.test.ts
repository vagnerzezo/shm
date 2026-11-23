import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { orm, updateDb } from "../app/_lib/db";
import { sessions } from "../app/_lib/db-schema";
import { createSessionToken, findSessionUser, hashToken, revokeSession, revokeUserSessions, tokenFrom } from "../app/_lib/sessions";
import { resetTestDb } from "../scripts/test-reset";
import { USERS } from "./fixtures";

const DAY = 24 * 60 * 60 * 1000;
const me = USERS.cliente;

const setExpiry = (token: string, expiresAt: number) =>
  orm.update(sessions).set({ expiresAt }).where(eq(sessions.token, hashToken(token)));
const expiryOf = async (token: string) =>
  (await orm.select().from(sessions).where(eq(sessions.token, hashToken(token))))[0]?.expiresAt;

before(resetTestDb);

test("o banco guarda o hash do token, não o token", async () => {
  const { token } = await createSessionToken(me.id);
  const rows = await orm.select().from(sessions).where(eq(sessions.userId, me.id));
  assert.ok(rows.some((r) => r.token === hashToken(token)));
  assert.ok(!rows.some((r) => r.token === token));
});

test("token válido devolve o usuário; token desconhecido devolve null", async () => {
  const { token } = await createSessionToken(me.id);
  const user = await findSessionUser(token);
  assert.equal(user?.id, me.id);
  assert.equal(user?.email, me.email);
  assert.equal(user?.role, "cliente");
  assert.equal(await findSessionUser("nao-existe"), null);
  assert.equal(await findSessionUser(""), null);
});

test("sessão expirada devolve null", async () => {
  const { token } = await createSessionToken(me.id);
  await setExpiry(token, Date.now() - 1000);
  assert.equal(await findSessionUser(token), null);
});

test("faltando menos de 15 dias, renova para 30", async () => {
  const { token } = await createSessionToken(me.id);
  await setExpiry(token, Date.now() + 10 * DAY);
  assert.ok(await findSessionUser(token));
  assert.ok((await expiryOf(token))! > Date.now() + 29 * DAY);
});

test("faltando mais de 15 dias, não mexe na validade", async () => {
  const { token } = await createSessionToken(me.id);
  const expiresAt = Date.now() + 20 * DAY;
  await setExpiry(token, expiresAt);
  assert.ok(await findSessionUser(token));
  assert.equal(await expiryOf(token), expiresAt);
});

test("revokeSession encerra só aquela sessão", async () => {
  const a = await createSessionToken(me.id);
  const b = await createSessionToken(me.id);
  await revokeSession(a.token);
  assert.equal(await findSessionUser(a.token), null);
  assert.ok(await findSessionUser(b.token));
});

test("revokeUserSessions mantém só a sessão indicada", async () => {
  const keep = await createSessionToken(me.id);
  const other = await createSessionToken(me.id);
  await revokeUserSessions(me.id, keep.token);
  assert.ok(await findSessionUser(keep.token));
  assert.equal(await findSessionUser(other.token), null);
});

test("conta desativada perde o acesso mesmo com sessão aberta", async () => {
  const { token } = await createSessionToken(USERS.cliente2.id);
  await updateDb((db) => {
    db.users.find((u) => u.id === USERS.cliente2.id)!.disabledAt = new Date().toISOString();
  });
  assert.equal(await findSessionUser(token), null);
});

describe("token da requisição", () => {
  test("Bearer vale e tem prioridade sobre o cookie", () => {
    assert.equal(tokenFrom("Bearer abc", "cookie"), "abc");
    assert.equal(tokenFrom("  bearer   abc ", null), "abc");
  });

  test("Bearer malformado não cai no cookie", () => {
    assert.equal(tokenFrom("Bearer", "cookie"), null);
    assert.equal(tokenFrom("Bearer a b", "cookie"), null);
  });

  test("cabeçalho de outro tipo é ignorado e vale o cookie", () => {
    assert.equal(tokenFrom("Basic dXNlcjpzZW5oYQ==", "cookie"), "cookie");
    assert.equal(tokenFrom("lixo", null), null);
  });

  test("sem cabeçalho, vale o cookie", () => {
    assert.equal(tokenFrom(null, "cookie"), "cookie");
    assert.equal(tokenFrom(null, null), null);
  });
});
