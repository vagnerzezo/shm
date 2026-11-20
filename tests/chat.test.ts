import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { canOpen, type Scope } from "../app/_lib/access";
import { addDays, nowInStudio } from "../app/_lib/availability";
import { addMessage, authorNameOf, getConversations } from "../app/_lib/chat";
import { toCustomer } from "../app/_lib/roles";
import { readDb, updateDb } from "../app/_lib/db";
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

describe("chat do barbeiro", () => {
  beforeEach(resetTestDb);
  const heitor: Scope = { all: false, professional: "Heitor", userId: USERS.heitor.id };

  test("barbeiro abre o chat", () => {
    const barber = toCustomer({ id: "b", name: "B", phone: "", email: "b@shm.test", role: "barbeiro", professional: "Heitor" });
    assert.equal(canOpen(barber, "chat"), true);
  });

  test("conversas do barbeiro: só clientes com horário com ele", async () => {
    const day = addDays(nowInStudio().date, 3);
    await updateDb((db) => {
      db.reservations.push(
        { id: "r-h", userId: USERS.cliente.id, serviceId: "corte-heitor", professional: "Heitor", date: day, time: "10:00" },
        { id: "r-j", userId: USERS.cliente2.id, serviceId: "corte-jimmy", professional: "Jimmy", date: day, time: "10:00" },
      );
    });
    await addMessage(USERS.cliente.id, "cliente", "oi do 1");
    await addMessage(USERS.cliente2.id, "cliente", "oi do 2");
    assert.deepEqual((await getConversations(heitor)).map((c) => c.customer.id), [USERS.cliente.id]);
    // Sem escopo (admin): todos os clientes, com ou sem mensagem.
    assert.equal((await getConversations()).length, 3);
  });
});
