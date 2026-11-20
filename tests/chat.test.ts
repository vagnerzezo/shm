import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { addMessage, authorNameOf } from "../app/_lib/chat";
import { readDb } from "../app/_lib/db";
import { resetTestDb } from "../scripts/test-reset";
import { USERS } from "./fixtures";

describe("autor da mensagem", () => {
  beforeEach(resetTestDb);

  test("mensagem da equipe guarda quem escreveu", async () => {
    const m = await addMessage(USERS.cliente.id, "admin", "oi", USERS.heitor.id);
    assert.equal(m!.authorId, USERS.heitor.id);
    assert.equal((await readDb()).messages.find((x) => x.id === m!.id)!.authorId, USERS.heitor.id);
  });

  test("mensagem do cliente não guarda autor", async () => {
    const m = await addMessage(USERS.cliente.id, "cliente", "oi", USERS.heitor.id);
    assert.equal(m!.authorId, undefined);
  });

  test("nome do autor: primeiro nome, ou nada sem autor", async () => {
    const users = (await readDb()).users;
    assert.equal(authorNameOf({ id: "1", customerId: "c", from: "admin", text: "x", createdAt: "", authorId: USERS.heitor.id }, users), "Heitor");
    assert.equal(authorNameOf({ id: "2", customerId: "c", from: "admin", text: "x", createdAt: "" }, users), null);
  });
});
