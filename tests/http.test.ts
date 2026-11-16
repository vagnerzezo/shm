import assert from "node:assert/strict";
import { test } from "node:test";
import { handle, readBody } from "../app/_lib/api/http";
import { parseDate, parseRange } from "../app/_lib/api/params";
import { DomainError } from "../app/_lib/errors";

const post = (body: string) => new Request("http://x/api", { method: "POST", body });
const call = (fn: () => Promise<unknown>) => handle(fn)(new Request("http://x/api"), undefined);

test("handle: objeto devolvido vira 200 em JSON", async () => {
  const res = await call(async () => ({ a: 1 }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { a: 1 });
});

test("handle: DomainError vira o JSON de erro com o status do código", async () => {
  const res = await call(async () => {
    throw new DomainError("slot_unavailable", "x", { time: "y" });
  });
  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { error: { code: "slot_unavailable", message: "x", fields: { time: "y" } } });
});

test("handle: erro inesperado vira 500 sem vazar a mensagem", async (t) => {
  t.mock.method(console, "error", () => {});
  const res = await call(async () => {
    throw new Error("boom");
  });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error.code, "internal");
  assert.ok(!JSON.stringify(body).includes("boom"));
});

for (const body of ["{", "[1]", "null", '"texto"', ""]) {
  test(`readBody: corpo ${JSON.stringify(body)} é erro de validação`, async () => {
    await assert.rejects(readBody(post(body)), (e: unknown) => e instanceof DomainError && e.code === "validation");
  });
}

test("readBody: objeto JSON é devolvido", async () => {
  assert.deepEqual(await readBody(post('{"a":1}')), { a: 1 });
});

const isValidation = (field: string) => (e: unknown) =>
  e instanceof DomainError && e.code === "validation" && typeof e.fields?.[field] === "string";

for (const value of ["2026-02-31", "13/11/2026", "", undefined, 20261113]) {
  test(`parseDate: ${JSON.stringify(value)} é erro de validação no campo`, () => {
    assert.throws(() => parseDate(value, "from"), isValidation("from"));
  });
}

test("parseDate: dia que existe é devolvido", () => {
  assert.equal(parseDate("2028-02-29", "from"), "2028-02-29");
});

test("parseRange: from depois de to é erro em to", () => {
  assert.throws(() => parseRange("2026-11-20", "2026-11-19"), isValidation("to"));
});

test("parseRange: 32 dias é erro em to; 31 dias passa", () => {
  assert.throws(() => parseRange("2026-12-01", "2027-01-01"), isValidation("to"));
  assert.deepEqual(parseRange("2026-12-01", "2026-12-31"), { from: "2026-12-01", to: "2026-12-31" });
});

test("parseRange: um dia só passa; data impossível aponta o campo", () => {
  assert.deepEqual(parseRange("2026-12-01", "2026-12-01"), { from: "2026-12-01", to: "2026-12-01" });
  assert.throws(() => parseRange("2026-02-31", "2026-03-01"), isValidation("from"));
  assert.throws(() => parseRange("2026-03-01", undefined), isValidation("to"));
});
