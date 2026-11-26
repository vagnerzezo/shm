import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { orm } from "../app/_lib/db";
import { sessions } from "../app/_lib/db-schema";
import { deleteCustomerByAdmin } from "../app/_lib/domain/account";
import { hrefOf, type Notification } from "../app/_lib/notifications";
import { pushMessagesFor, pushSendOptions, setPushSender, waitForPush, type PushSender } from "../app/_lib/push/dispatch";
import { ensureSubscription } from "../app/_lib/push/ensure-subscription";
import { addDays, nowInStudio } from "../app/_lib/availability";
import { readDb } from "../app/_lib/db";
import { bookForCustomer } from "../app/_lib/domain/bookings";
import { toCustomer } from "../app/_lib/roles";
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

const base = { phone: "", consent: undefined };
const admin = toCustomer({ ...base, id: "adm", name: "Admin", email: "a@shm.test", role: "admin" });
const hei = toCustomer({ ...base, id: "hei", name: "Heitor", email: "h@shm.test", role: "barbeiro", professional: "Heitor" });
const jim = toCustomer({ ...base, id: "jim", name: "Jimmy", email: "j@shm.test", role: "barbeiro", professional: "Jimmy" });
const cli = toCustomer({ ...base, id: "cli", name: "Ana", email: "c@shm.test" });
const notice = (over: Partial<Notification>): Notification => ({
  id: crypto.randomUUID(),
  kind: "reserva_marcada",
  at: "2026-11-27T12:00:00.000Z",
  text: "Ana marcou Corte · 27/11 10:00",
  reservationId: "r1",
  date: "2026-11-27",
  professional: "Heitor",
  actorId: "cli",
  ...over,
});
const who = (msgs: { userId: string }[]) => msgs.map((m) => m.userId).sort();

describe("quem recebe no celular", () => {
  test("reserva do Heitor feita pelo cliente: admin e Heitor, não Jimmy", () => {
    const n = notice({});
    const msgs = pushMessagesFor([n], [admin, hei, jim, cli]);
    assert.deepEqual(who(msgs), ["adm", "hei"]);
    assert.deepEqual(msgs[0].payload, { title: "Nova marcação", body: n.text, url: hrefOf(n), tag: "reserva-r1" });
  });

  test("títulos de remarcação e cancelamento", () => {
    const [r] = pushMessagesFor([notice({ kind: "reserva_remarcada" })], [hei]);
    const [c] = pushMessagesFor([notice({ kind: "reserva_cancelada" })], [hei]);
    assert.equal(r.payload.title, "Remarcação");
    assert.equal(c.payload.title, "Cancelamento");
  });

  test("quem fez não recebe", () => {
    assert.deepEqual(who(pushMessagesFor([notice({ actorId: "hei" })], [admin, hei])), ["adm"]);
  });

  test("remarcação que troca de profissional: um envio por pessoa", () => {
    const a = notice({ kind: "reserva_remarcada", professional: "Jimmy" });
    const b = notice({ kind: "reserva_remarcada", professional: "Heitor" });
    assert.deepEqual(who(pushMessagesFor([a, b], [admin, hei, jim])), ["adm", "hei", "jim"]);
  });

  test("admin que atende marcando na própria agenda não recebe", () => {
    const adminHeitor = toCustomer({ ...base, id: "adm", name: "Admin", email: "a@shm.test", role: "admin", professional: "Heitor" });
    assert.deepEqual(who(pushMessagesFor([notice({ actorId: "adm" })], [adminHeitor, hei])), ["hei"]);
    assert.deepEqual(who(pushMessagesFor([notice({})], [adminHeitor])), ["adm"]);
  });

  test("outros avisos do sino não vão para o celular", () => {
    for (const kind of ["dia_fechado", "cliente_novo", "falha_email", "falha_marketing"] as const) {
      assert.deepEqual(pushMessagesFor([notice({ kind })], [admin, hei]), [], kind);
    }
  });

  test("cliente e desativado não recebem", () => {
    const off = { ...hei, disabledAt: "2026-11-01T00:00:00.000Z" };
    assert.deepEqual(pushMessagesFor([notice({ actorId: "jim" })], [cli, off]), []);
  });
});

describe("envio", () => {
  const day = addDays(nowInStudio().date, 5);
  const keys = { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:teste@shm.test" };
  let calls: { endpoint: string; payload: string }[] = [];
  const fake =
    (fail?: (endpoint: string) => unknown): PushSender =>
    async (s, payload) => {
      calls.push({ endpoint: s.endpoint, payload });
      const err = fail?.(s.endpoint);
      if (err) throw err;
      return { statusCode: 201 };
    };
  const book = () => bookForCustomer(cliente, [{ serviceId: "corte-heitor", date: day, time: "10:00" }]);
  const subscribeHeitor = async (n = 1) => {
    const { token } = await createSessionToken(heitor);
    await savePushSubscription(token, heitor, sub(n));
  };

  beforeEach(async () => {
    await resetTestDb();
    Object.assign(process.env, keys);
    calls = [];
    setPushSender(fake());
  });
  afterEach(() => setPushSender(null));

  test("cliente marca com Heitor: o aparelho do Heitor recebe", async () => {
    await subscribeHeitor();
    await book();
    await waitForPush();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].endpoint, sub().endpoint);
    assert.equal(JSON.parse(calls[0].payload).title, "Nova marcação");
  });

  test("404/410 apaga a inscrição", async () => {
    await subscribeHeitor();
    setPushSender(fake(() => Object.assign(new Error("Gone"), { statusCode: 410 })));
    await book();
    await waitForPush();
    assert.equal((await activePushSubscriptions([heitor])).length, 0);
  });

  test("falha do envio não desfaz a reserva", async () => {
    await subscribeHeitor();
    setPushSender(fake(() => new Error("rede caiu")));
    const [id] = await book();
    await waitForPush();
    assert.ok((await readDb()).reservations.some((r) => r.id === id));
    assert.equal((await activePushSubscriptions([heitor])).length, 1);
  });

  test("um aparelho falhando não impede o outro", async () => {
    await subscribeHeitor(1);
    await subscribeHeitor(2);
    setPushSender(fake((endpoint) => (endpoint === sub(1).endpoint ? new Error("lento") : undefined)));
    await book();
    await waitForPush();
    assert.deepEqual(calls.map((c) => c.endpoint).sort(), [sub(1).endpoint, sub(2).endpoint]);
  });

  test("sem chaves nada é enviado", async () => {
    await subscribeHeitor();
    delete process.env.VAPID_PRIVATE_KEY;
    await book();
    await waitForPush();
    assert.equal(calls.length, 0);
  });
});

describe("revisão final", () => {
  test("aviso sai com urgência alta (Android não segura com o celular parado)", () => {
    assert.equal(pushSendOptions().urgency, "high");
  });

  const fakeManager = (existing: string | null) => {
    const log: string[] = [];
    const make = (endpoint: string) => ({ endpoint, unsubscribe: async () => (log.push(`unsubscribe ${endpoint}`), true) });
    return {
      log,
      pm: {
        getSubscription: async () => (existing ? make(existing) : null),
        subscribe: async () => (log.push("subscribe"), make("https://push.example.test/novo")),
      },
    };
  };

  test("inscrição que o servidor não conhece é trocada por uma nova", async () => {
    const { pm, log } = fakeManager("https://push.example.test/velho");
    const sub = await ensureSubscription(pm, async () => false, new Uint8Array([1]));
    assert.equal(sub.endpoint, "https://push.example.test/novo");
    assert.deepEqual(log, ["unsubscribe https://push.example.test/velho", "subscribe"]);
  });

  test("inscrição que o servidor conhece é mantida", async () => {
    const { pm, log } = fakeManager("https://push.example.test/velho");
    const sub = await ensureSubscription(pm, async () => true, new Uint8Array([1]));
    assert.equal(sub.endpoint, "https://push.example.test/velho");
    assert.deepEqual(log, []);
  });

  test("sem inscrição no navegador, inscreve", async () => {
    const { pm, log } = fakeManager(null);
    assert.equal((await ensureSubscription(pm, async () => false, new Uint8Array([1]))).endpoint, "https://push.example.test/novo");
    assert.deepEqual(log, ["subscribe"]);
  });
});
