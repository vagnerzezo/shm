import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isForUser, type Notification } from "../app/_lib/notifications";
import { toCustomer } from "../app/_lib/roles";

const base = { phone: "", consent: undefined };
const admin = toCustomer({ ...base, id: "adm", name: "Admin", email: "a@shm.test", role: "admin" });
const heitor = toCustomer({ ...base, id: "hei", name: "Heitor", email: "h@shm.test", role: "barbeiro", professional: "Heitor" });
const jimmy = toCustomer({ ...base, id: "jim", name: "Jimmy", email: "j@shm.test", role: "barbeiro", professional: "Jimmy" });
const n = (over: Partial<Notification>): Notification => ({ id: "n", kind: "reserva_marcada", at: "2026-11-20T12:00:00.000Z", text: "x", ...over });

describe("quem recebe cada aviso", () => {
  test("reserva do Heitor: admin e Heitor recebem; Jimmy não", () => {
    const r = n({ kind: "reserva_marcada", professional: "Heitor", actorId: "cli" });
    assert.deepEqual([isForUser(r, admin), isForUser(r, heitor), isForUser(r, jimmy)], [true, true, false]);
  });

  test("ninguém é avisado do que fez", () => {
    assert.equal(isForUser(n({ kind: "reserva_cancelada", professional: "Heitor", actorId: "hei" }), heitor), false);
    assert.equal(isForUser(n({ kind: "reserva_marcada", professional: "Heitor", actorId: "adm" }), admin), false);
    assert.equal(isForUser(n({ kind: "reserva_marcada", professional: "Heitor", actorId: "adm" }), heitor), true);
  });

  test("dia fechado: barbeiro recebe o dele e o do estúdio todo; admin não (foi ele)", () => {
    assert.equal(isForUser(n({ kind: "dia_fechado", professional: "Heitor", actorId: "adm" }), heitor), true);
    assert.equal(isForUser(n({ kind: "dia_fechado", actorId: "adm" }), jimmy), true);
    assert.equal(isForUser(n({ kind: "dia_fechado", professional: "Heitor", actorId: "adm" }), jimmy), false);
  });

  test("avisos só do admin: cliente novo e falhas", () => {
    for (const kind of ["cliente_novo", "falha_marketing", "falha_email"] as const) {
      assert.equal(isForUser(n({ kind }), admin), true, kind);
      assert.equal(isForUser(n({ kind, professional: "Heitor" }), heitor), false, kind);
    }
  });

  test("cliente nunca recebe", () => {
    const cli = toCustomer({ ...base, id: "c", name: "C", email: "c@shm.test" });
    assert.equal(isForUser(n({ professional: "Heitor" }), cli), false);
  });
});
