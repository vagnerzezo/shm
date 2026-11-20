import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { addDays, nowInStudio } from "../app/_lib/availability";
import { addMessage } from "../app/_lib/chat";
import { readDb, updateDb } from "../app/_lib/db";
import { deleteOwnAccount, registerCustomer } from "../app/_lib/domain/account";
import { bookByAdmin, bookForCustomer, cancelForCustomer, rescheduleByAdmin, rescheduleForCustomer } from "../app/_lib/domain/bookings";
import { sendWelcomeEmail } from "../app/_lib/email-templates/send";
import { markCancelled } from "../app/_lib/reservations";
import { resetTestDb } from "../scripts/test-reset";
import { PASSWORD, USERS } from "./fixtures";
import { getBell, isForUser, markBellSeen, type Notification } from "../app/_lib/notifications";
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

describe("acontecimentos viram avisos", () => {
  beforeEach(resetTestDb);
  const day = addDays(nowInStudio().date, 5);
  const last = async () => (await readDb()).notifications.at(-1);
  const all = async () => (await readDb()).notifications;

  test("cliente marca: aviso com profissional, cliente, reserva e quem fez", async () => {
    const [id] = await bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-heitor", date: day, time: "10:00" }]);
    const n = await last();
    assert.deepEqual(
      { kind: n!.kind, professional: n!.professional, customerId: n!.customerId, actorId: n!.actorId, reservationId: n!.reservationId, date: n!.date },
      { kind: "reserva_marcada", professional: "Heitor", customerId: USERS.cliente.id, actorId: USERS.cliente.id, reservationId: id, date: day },
    );
    assert.match(n!.text, /Cliente Teste marcou Corte com Heitor/);
  });

  test("serviço sem profissional fixo: aviso vai para quem atende", async () => {
    const [id] = await bookForCustomer(USERS.cliente.id, [{ serviceId: "barba-pigmentacao", date: day, time: "10:00" }]);
    const r = (await readDb()).reservations.find((x) => x.id === id)!;
    assert.equal((await last())!.professional, r.professional);
  });

  test("cliente remarca e cancela", async () => {
    const [id] = await bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-heitor", date: day, time: "10:00" }]);
    await rescheduleForCustomer(USERS.cliente.id, id, day, "15:00");
    assert.equal((await last())!.kind, "reserva_remarcada");
    await cancelForCustomer(USERS.cliente.id, id);
    assert.deepEqual([(await last())!.kind, (await last())!.actorId], ["reserva_cancelada", USERS.cliente.id]);
  });

  test("equipe marca, remarca e cancela: quem fez fica gravado", async () => {
    const id = await bookByAdmin({ customerId: USERS.cliente.id, serviceId: "corte-heitor", date: day, time: "10:00" }, { all: true }, USERS.admin.id);
    assert.deepEqual([(await last())!.kind, (await last())!.actorId], ["reserva_marcada", USERS.admin.id]);
    await rescheduleByAdmin(id, day, "15:00", { all: true }, USERS.admin.id);
    assert.equal((await last())!.kind, "reserva_remarcada");
    await markCancelled(id, "admin", { reason: "x", actorId: USERS.admin.id });
    assert.deepEqual([(await last())!.kind, (await last())!.actorId], ["reserva_cancelada", USERS.admin.id]);
  });

  test("ação recusada não grava aviso", async () => {
    await assert.rejects(bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-heitor", date: "2026-02-31", time: "10:00" }]));
    assert.equal((await all()).length, 0);
  });

  test("cadastro pelo site avisa o admin", async () => {
    const u = await registerCustomer({ name: "Nova Pessoa", phone: "51911112222", email: "nova@shm.test" }, "senha-boa-1", "203.0.113.5");
    assert.deepEqual([(await last())!.kind, (await last())!.customerId], ["cliente_novo", u.id]);
  });

  test("cliente que exclui a conta: aviso de cancelamento das reservas futuras", async () => {
    await bookForCustomer(USERS.cliente2.id, [{ serviceId: "corte-jimmy", date: day, time: "10:00" }]);
    await deleteOwnAccount(USERS.cliente2.id, PASSWORD);
    const n = (await last())!;
    assert.deepEqual([n.kind, n.professional, n.customerId], ["reserva_cancelada", "Jimmy", undefined]);
    assert.match(n.text, /Cliente Dois/);
  });

  test("e-mail com o envio desligado não vira falha", async () => {
    await sendWelcomeEmail(USERS.cliente.id);
    assert.equal((await all()).length, 0);
  });
});

describe("leitura do sino", () => {
  beforeEach(resetTestDb);
  const day = addDays(nowInStudio().date, 5);
  const me = async (id: string) => toCustomer((await readDb()).users.find((u) => u.id === id)!);
  const heitorScope = { all: false as const, professional: "Heitor", userId: USERS.heitor.id };

  test("barbeiro não vê o que ele mesmo fez; o admin vê", async () => {
    await bookByAdmin({ customerId: USERS.cliente.id, serviceId: "corte-heitor", date: day, time: "10:00" }, heitorScope, USERS.heitor.id);
    assert.equal((await getBell(await me(USERS.heitor.id))).items.length, 0);
    const admin = await getBell(await me(USERS.admin.id));
    assert.equal(admin.items.length, 1);
    assert.match(admin.items[0].href, /\/admin\/agenda\?/);
  });

  test("conta sem 'visto' conta só os últimos 30 dias", async () => {
    const old = new Date(Date.now() - 40 * 86400000).toISOString();
    await updateDb((db) => {
      db.notifications.push({ id: "velho", kind: "cliente_novo", at: old, text: "antigo" });
    });
    await registerCustomer({ name: "Nova Pessoa", phone: "51911112222", email: "nova@shm.test" }, "senha-boa-1", "203.0.113.9");
    const bell = await getBell(await me(USERS.admin.id));
    assert.deepEqual([bell.unseen, bell.items.length], [1, 1]);
  });

  test("abrir o sino zera; aviso novo volta a contar", async () => {
    await bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-heitor", date: day, time: "10:00" }]);
    assert.equal((await getBell(await me(USERS.heitor.id))).unseen, 1);
    await markBellSeen(USERS.heitor.id);
    assert.equal((await getBell(await me(USERS.heitor.id))).unseen, 0);
    await new Promise((r) => setTimeout(r, 5));
    await bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-heitor", date: day, time: "15:00" }]);
    assert.equal((await getBell(await me(USERS.heitor.id))).unseen, 1);
  });

  test("mensagens: barbeiro só dos clientes dele; admin de todos", async () => {
    await bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-heitor", date: day, time: "10:00" }]);
    await markBellSeen(USERS.heitor.id);
    await addMessage(USERS.cliente.id, "cliente", "do cliente do Heitor");
    await addMessage(USERS.cliente2.id, "cliente", "de outro");
    const heitor = await getBell(await me(USERS.heitor.id));
    assert.deepEqual(heitor.items.filter((i) => i.unseen).map((i) => i.href), [`/admin/chat?cliente=${USERS.cliente.id}`]);
    const admin = await getBell(await me(USERS.admin.id));
    assert.equal(admin.items.filter((i) => i.href.startsWith("/admin/chat")).length, 2);
  });

  test("confirme quem veio: um item com a contagem", async () => {
    const past = nowInStudio().date;
    await updateDb((db) => {
      db.reservations.push({ id: "p1", userId: USERS.cliente.id, serviceId: "corte-heitor", professional: "Heitor", date: past, time: "00:00" });
    });
    const items = (await getBell(await me(USERS.heitor.id))).items.filter((i) => i.text.startsWith("Confirme quem veio"));
    assert.equal(items.length, 1);
    assert.match(items[0].text, /1 horário/);
  });
});
