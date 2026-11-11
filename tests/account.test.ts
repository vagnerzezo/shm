import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { authenticate } from "../app/_lib/domain/account";
import { DomainError } from "../app/_lib/errors";
import { resetTestDb } from "../scripts/test-reset";
import { PASSWORD, USERS } from "./fixtures";

export const rejectsWith = (code: string, field?: string) => (e: unknown) =>
  e instanceof DomainError && e.code === code && (!field || Boolean(e.fields?.[field]));

describe("authenticate", () => {
  before(resetTestDb);

  test("senha certa devolve o usuário", async () => {
    assert.equal((await authenticate(USERS.cliente.email, PASSWORD)).id, USERS.cliente.id);
  });

  test("e-mail com espaços e maiúsculas funciona", async () => {
    assert.equal((await authenticate("  CLIENTE@shm.test ", PASSWORD)).id, USERS.cliente.id);
  });

  test("senha errada e e-mail inexistente dão o mesmo erro", async () => {
    const wrong = await authenticate(USERS.cliente.email, "errada").catch((e) => e);
    const missing = await authenticate("ninguem@shm.test", "errada").catch((e) => e);
    assert.ok(rejectsWith("invalid_credentials")(wrong));
    assert.ok(rejectsWith("invalid_credentials")(missing));
    assert.equal(wrong.message, missing.message);
  });

  test("acerto zera a contagem de erros", async () => {
    for (let i = 0; i < 9; i++) await authenticate(USERS.jimmy.email, "errada").catch(() => {});
    await authenticate(USERS.jimmy.email, PASSWORD);
    for (let i = 0; i < 9; i++) await authenticate(USERS.jimmy.email, "errada").catch(() => {});
    assert.equal((await authenticate(USERS.jimmy.email, PASSWORD)).id, USERS.jimmy.id);
  });

  test("depois de 10 erros, bloqueia até com a senha certa", async () => {
    for (let i = 0; i < 10; i++) {
      await assert.rejects(authenticate(USERS.cliente2.email, "errada"), rejectsWith("invalid_credentials"));
    }
    await assert.rejects(authenticate(USERS.cliente2.email, PASSWORD), rejectsWith("rate_limited"));
    // O bloqueio é por e-mail: outra conta continua entrando.
    assert.equal((await authenticate(USERS.cliente.email, PASSWORD)).id, USERS.cliente.id);
  });
});
