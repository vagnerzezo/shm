import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { addDays, nowInStudio } from "../app/_lib/availability";
import { readDb, updateDb } from "../app/_lib/db";
import {
  bookByAdmin,
  bookForCustomer,
  cancelForCustomer,
  rescheduleByAdmin,
  rescheduleForCustomer,
} from "../app/_lib/domain/bookings";
import { DomainError } from "../app/_lib/errors";
import { resetTestDb } from "../scripts/test-reset";
import { USERS } from "./fixtures";

const rejectsWith = (code: string) => (e: unknown) => e instanceof DomainError && e.code === code;
const DAY = addDays(nowInStudio().date, 10);
const OTHER_DAY = addDays(nowInStudio().date, 11);
const { cliente, cliente2, heitor } = USERS;
const active = async () => (await readDb()).reservations.filter((r) => !r.cancelledAt);
const item = (serviceId: string, time: string, date = DAY) => ({ serviceId, date, time });

describe("marcação", () => {
  beforeEach(resetTestDb);

  test("marca e grava o profissional e o preço", async () => {
    const [id] = await bookForCustomer(cliente.id, [item("corte-heitor", "10:00")], "  chegar cedo ");
    const r = (await readDb()).reservations.find((r) => r.id === id)!;
    assert.deepEqual(
      { userId: r.userId, professional: r.professional, priceCents: r.priceCents, note: r.note, date: r.date, time: r.time },
      { userId: cliente.id, professional: "Heitor", priceCents: 7000, note: "chegar cedo", date: DAY, time: "10:00" },
    );
  });

  test("corrida: dois clientes no mesmo horário do mesmo profissional, só um consegue", async () => {
    const results = await Promise.allSettled([
      bookForCustomer(cliente.id, [item("corte-heitor", "10:00")]),
      bookForCustomer(cliente2.id, [item("corte-heitor", "10:00")]),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const lost = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.ok(rejectsWith("slot_unavailable")(lost.reason));
    assert.equal((await active()).length, 1);
  });

  test("serviço sem profissional fixo: dois ao mesmo tempo vão para profissionais diferentes, o terceiro não cabe", async () => {
    await Promise.all([
      bookForCustomer(cliente.id, [item("barba-pigmentacao", "10:00")]),
      bookForCustomer(cliente2.id, [item("barba-pigmentacao", "10:00")]),
    ]);
    const pros = (await active()).map((r) => r.professional).sort();
    assert.deepEqual(pros, ["Heitor", "Jimmy"]);
    await assert.rejects(bookForCustomer(heitor.id, [item("barba-pigmentacao", "10:00")]), rejectsWith("slot_unavailable"));
  });

  test("vários itens: tudo ou nada", async () => {
    await bookForCustomer(cliente2.id, [item("corte-heitor", "14:00")]);
    await assert.rejects(
      bookForCustomer(cliente.id, [item("corte-jimmy", "10:00"), item("corte-heitor", "14:00")]),
      rejectsWith("slot_unavailable"),
    );
    assert.equal((await active()).filter((r) => r.userId === cliente.id).length, 0);
  });

  for (const [name, items] of [
    ["lista vazia", []],
    ["11 itens", Array.from({ length: 11 }, (_, i) => item("corte-jimmy", "09:00", addDays(DAY, i)))],
    ["item repetido", [item("corte-heitor", "10:00"), item("corte-heitor", "10:00")]],
    ["dois itens do mesmo cliente que se sobrepõem", [item("corte-heitor", "10:00"), item("corte-jimmy", "10:30")]],
    ["dia que não existe", [item("corte-heitor", "10:00", "2026-02-31")]],
    ["hora inválida", [item("corte-heitor", "25:00")]],
    ["hora fora da grade", [item("corte-heitor", "10:10")]],
    ["serviço inexistente", [item("nao-existe", "10:00")]],
    ["item sem campos", [{} as never]],
  ] as const) {
    test(`recusa ${name} sem gravar nada`, async () => {
      await assert.rejects(bookForCustomer(cliente.id, [...items]), (e) => e instanceof DomainError);
      assert.equal((await active()).length, 0);
    });
  }

  test("dia inválido e hora inválida são erro de validação", async () => {
    await assert.rejects(bookForCustomer(cliente.id, [item("corte-heitor", "10:00", "2026-02-31")]), rejectsWith("validation"));
    await assert.rejects(bookForCustomer(cliente.id, [item("corte-heitor", "25:00")]), rejectsWith("validation"));
    await assert.rejects(bookForCustomer(cliente.id, []), rejectsWith("validation"));
  });

  test("remarcar troca dia e hora e devolve como era", async () => {
    const [id] = await bookForCustomer(cliente.id, [item("corte-heitor", "10:00")]);
    const { before, serviceName } = await rescheduleForCustomer(cliente.id, id, OTHER_DAY, "15:00");
    assert.equal(before.time, "10:00");
    assert.equal(serviceName, "Corte com Heitor");
    const r = (await readDb()).reservations.find((r) => r.id === id)!;
    assert.deepEqual([r.date, r.time, r.professional], [OTHER_DAY, "15:00", "Heitor"]);
  });

  test("remarcar para horário ocupado é recusado", async () => {
    const [id] = await bookForCustomer(cliente.id, [item("corte-heitor", "10:00")]);
    await bookForCustomer(cliente2.id, [item("corte-heitor", "15:00")]);
    await assert.rejects(rescheduleForCustomer(cliente.id, id, DAY, "15:00"), rejectsWith("slot_unavailable"));
  });

  test("remarcar para o mesmo horário é erro de validação", async () => {
    const [id] = await bookForCustomer(cliente.id, [item("corte-heitor", "10:00")]);
    await assert.rejects(rescheduleForCustomer(cliente.id, id, DAY, "10:00"), rejectsWith("validation"));
  });

  test("remarcar ou cancelar a reserva de outro cliente dá not_found", async () => {
    const [id] = await bookForCustomer(cliente.id, [item("corte-heitor", "10:00")]);
    await assert.rejects(rescheduleForCustomer(cliente2.id, id, OTHER_DAY, "15:00"), rejectsWith("not_found"));
    await assert.rejects(cancelForCustomer(cliente2.id, id), rejectsWith("not_found"));
    await assert.rejects(cancelForCustomer(cliente.id, "nao-existe"), rejectsWith("not_found"));
  });

  test("cancelar marca como cancelada, libera o horário e não repete", async () => {
    const [id] = await bookForCustomer(cliente.id, [item("corte-heitor", "10:00")]);
    const before = await cancelForCustomer(cliente.id, id);
    assert.equal(before.cancelledAt, undefined);
    const r = (await readDb()).reservations.find((r) => r.id === id)!;
    assert.equal(r.cancelledBy, "cliente");
    assert.ok(r.cancelledAt);
    await assert.rejects(cancelForCustomer(cliente.id, id), rejectsWith("not_found"));
    await bookForCustomer(cliente2.id, [item("corte-heitor", "10:00")]);
  });

  test("cancelar ou remarcar reserva que já passou é erro de validação", async () => {
    await updateDb((db) => {
      db.reservations.push({ id: "passada", userId: cliente.id, serviceId: "corte-heitor", date: "2026-01-05", time: "10:00" });
    });
    await assert.rejects(cancelForCustomer(cliente.id, "passada"), rejectsWith("validation"));
    await assert.rejects(rescheduleForCustomer(cliente.id, "passada", DAY, "10:00"), rejectsWith("validation"));
  });

  test("admin marca para o cliente, inclusive em data passada", async () => {
    const id = await bookByAdmin({ customerId: cliente.id, serviceId: "corte-heitor", date: "2026-01-06", time: "10:00", note: "ligou" });
    const r = (await readDb()).reservations.find((r) => r.id === id)!;
    assert.deepEqual([r.createdBy, r.professional, r.note, r.priceCents], ["admin", "Heitor", "ligou", 7000]);
  });

  test("admin não marca em cima de outro horário do mesmo profissional", async () => {
    await bookForCustomer(cliente2.id, [item("corte-heitor", "10:00")]);
    await assert.rejects(
      bookByAdmin({ customerId: cliente.id, serviceId: "barba-heitor", date: DAY, time: "10:30" }),
      rejectsWith("slot_unavailable"),
    );
  });

  test("admin não marca para cliente inexistente nem em serviço inativo", async () => {
    await assert.rejects(bookByAdmin({ customerId: "x", serviceId: "corte-heitor", date: DAY, time: "10:00" }), rejectsWith("validation"));
    await updateDb((db) => {
      db.services!.find((s) => s.id === "corte-jimmy")!.active = false;
    });
    await assert.rejects(bookByAdmin({ customerId: cliente.id, serviceId: "corte-jimmy", date: DAY, time: "10:00" }), rejectsWith("validation"));
  });

  test("admin remarca; horário ocupado do mesmo profissional é recusado", async () => {
    const [id] = await bookForCustomer(cliente.id, [item("corte-heitor", "10:00")]);
    await bookForCustomer(cliente2.id, [item("corte-heitor", "15:00")]);
    await assert.rejects(rescheduleByAdmin(id, DAY, "15:00"), rejectsWith("slot_unavailable"));
    const before = await rescheduleByAdmin(id, DAY, "16:00");
    assert.equal(before.time, "10:00");
    assert.equal((await readDb()).reservations.find((r) => r.id === id)!.time, "16:00");
  });

  test("corrida do admin: duas marcações no mesmo horário, só uma entra", async () => {
    const results = await Promise.allSettled([
      bookByAdmin({ customerId: cliente.id, serviceId: "corte-heitor", date: DAY, time: "11:00" }),
      bookByAdmin({ customerId: cliente2.id, serviceId: "corte-heitor", date: DAY, time: "11:00" }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await active()).length, 1);
  });
});
