import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { addDays, nowInStudio } from "../app/_lib/availability";
import { serviceJson } from "../app/_lib/api/serialize";
import { updateDb } from "../app/_lib/db";
import { bookForCustomer } from "../app/_lib/domain/bookings";
import { availabilityFor, servicesByCategory } from "../app/_lib/domain/catalog";
import { DomainError } from "../app/_lib/errors";
import { resetTestDb } from "../scripts/test-reset";
import { USERS } from "./fixtures";

const rejectsWith = (code: string) => (e: unknown) => e instanceof DomainError && e.code === code;
const TODAY = nowInStudio().date;
const DAY = addDays(TODAY, 10);
const { cliente, cliente2 } = USERS;
const timesOn = async (input: Partial<Parameters<typeof availabilityFor>[0]>) =>
  (await availabilityFor({ serviceId: "corte-heitor", from: DAY, to: DAY, ...input })).days[0].times;

describe("catálogo e horários livres", () => {
  let mine = "";
  before(async () => {
    await resetTestDb();
    await bookForCustomer(cliente2.id, [{ serviceId: "corte-heitor", date: DAY, time: "10:00" }]);
    [mine] = await bookForCustomer(cliente.id, [{ serviceId: "corte-jimmy", date: DAY, time: "14:00" }]);
  });

  test("serviços: só os ativos, por categoria, professional null sem fixo", async () => {
    await updateDb((db) => {
      db.services!.find((s) => s.id === "barba-jimmy")!.active = false;
    });
    const { categories } = await servicesByCategory();
    await updateDb((db) => {
      delete db.services!.find((s) => s.id === "barba-jimmy")!.active;
    });
    assert.deepEqual(categories.map((c) => c.name), ["Heitor", "Barbearia"]);
    const all = categories.flatMap((c) => c.services.map(serviceJson));
    assert.equal(all.length, 8);
    assert.ok(!all.some((s) => s.id === "barba-jimmy"));
    assert.deepEqual(all.find((s) => s.id === "corte-esfoliacao"), {
      id: "corte-esfoliacao", name: "Corte e esfoliação facial", durationMinutes: 75, priceCents: 10000, professional: null,
    });
    assert.equal(all.find((s) => s.id === "corte-heitor")!.professional, "Heitor");
  });

  test("devolve todos os dias do intervalo; dia passado vem vazio", async () => {
    const { serviceId, days } = await availabilityFor({ serviceId: "corte-heitor", from: addDays(TODAY, -1), to: addDays(TODAY, 1) });
    assert.equal(serviceId, "corte-heitor");
    assert.deepEqual(days.map((d) => d.date), [addDays(TODAY, -1), TODAY, addDays(TODAY, 1)]);
    assert.deepEqual(days[0].times, []);
    assert.equal(days[2].times.length, 19);
  });

  test("reserva de outra pessoa ocupa o profissional", async () => {
    const times = await timesOn({});
    // Corte de 45 min às 10:00: 09:30, 10:00 e 10:30 batem com ele.
    assert.equal(times.length, 16);
    assert.ok(times.includes("09:00") && !times.includes("09:30") && !times.includes("10:30") && times.includes("11:00"));
  });

  test("com login, a reserva do próprio cliente bloqueia outro serviço no mesmo horário", async () => {
    assert.ok((await timesOn({})).includes("14:00"));
    const times = await timesOn({ userId: cliente.id });
    assert.ok(!times.includes("14:00") && !times.includes("14:30") && !times.includes("13:30"));
  });

  test("rescheduleOf ignora a própria reserva", async () => {
    const jimmy = { serviceId: "corte-jimmy", userId: cliente.id };
    assert.ok(!(await timesOn(jimmy)).includes("14:00"));
    assert.ok((await timesOn({ ...jimmy, rescheduleOf: mine })).includes("14:00"));
  });

  test("rescheduleOf de reserva de outro cliente: not_found; sem login: unauthenticated", async () => {
    await assert.rejects(timesOn({ userId: cliente2.id, rescheduleOf: mine }), rejectsWith("not_found"));
    await assert.rejects(timesOn({ rescheduleOf: mine }), rejectsWith("unauthenticated"));
  });

  test("serviço inexistente ou inativo: not_found", async () => {
    await assert.rejects(timesOn({ serviceId: "nao-existe" }), rejectsWith("not_found"));
    await updateDb((db) => {
      db.services!.find((s) => s.id === "corte-heitor")!.active = false;
    });
    try {
      await assert.rejects(timesOn({}), rejectsWith("not_found"));
    } finally {
      await updateDb((db) => {
        delete db.services!.find((s) => s.id === "corte-heitor")!.active;
      });
    }
  });
});
