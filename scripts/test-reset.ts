// Zera o banco de TESTE e grava os dados fixos dos testes.
// Uso: pnpm test:reset (carrega o .env.test). Recusa rodar em outro banco.

import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { SCHEDULE, USERS } from "../tests/fixtures";

/**
 * O `--env-file` não substitui variáveis que já estão no shell: um
 * DATABASE_URL do banco principal exportado no terminal passaria pelo
 * SHM_TEST_DB=1 do .env.test. Por isso a conexão tem que ser exatamente a
 * do arquivo .env.test.
 */
/** `DATABASE_URL` escrito num arquivo .env, ou `undefined`. */
function databaseUrlIn(file: string): string | undefined {
  let text = "";
  try {
    text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  } catch {
    return undefined;
  }
  const line = text.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  return line?.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim().replace(/^(['"])(.*)\1$/, "$2") || undefined;
}

const hostOf = (url: string) => {
  try {
    // O endpoint do Neon com e sem "-pooler" é o mesmo banco.
    return new URL(url).hostname.replace("-pooler.", ".");
  } catch {
    return url;
  }
};

export function assertTestDatabase() {
  if (process.env.SHM_TEST_DB !== "1") {
    throw new Error("test-reset só roda com SHM_TEST_DB=1 (use o .env.test). Nada foi apagado.");
  }
  const expected = databaseUrlIn(".env.test");
  if (!expected) throw new Error("Não achei o DATABASE_URL do .env.test. Nada foi apagado.");
  if (process.env.DATABASE_URL !== expected) {
    throw new Error(
      "O DATABASE_URL em uso não é o banco de teste do .env.test (há outro exportado no terminal?). Nada foi apagado.",
    );
  }
  // O .env.test apontando para o banco de verdade (o do .env) apagaria os dados reais.
  const main = databaseUrlIn(".env");
  if (main && hostOf(main) === hostOf(expected)) {
    throw new Error(
      "O .env.test aponta para o mesmo banco do .env (o de verdade). Use um branch só para testes no Neon. Nada foi apagado.",
    );
  }
}

export async function resetTestDb() {
  assertTestDatabase();
  const { orm, updateDb } = await import("../app/_lib/db");
  const { hashPassword } = await import("../app/_lib/passwords");
  const { DEFAULT_PROFESSIONALS, DEFAULT_SERVICES } = await import("../app/_lib/services");

  const tables = await orm.execute(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = tables.rows.map((r) => `"${String(r.tablename)}"`).join(", ");
  await orm.execute(sql.raw(`truncate ${names} restart identity cascade`));

  const passwordHash = await hashPassword(USERS.cliente.password);
  await updateDb((db) => {
    for (const [key, u] of Object.entries(USERS)) {
      db.users.push({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        passwordHash,
        createdAt: "2026-01-01T12:00:00.000Z",
        ...(key === "admin" && { role: "admin" as const }),
        ...(key === "heitor" && { role: "barbeiro" as const, professional: "Heitor" }),
        ...(key === "jimmy" && { role: "barbeiro" as const, professional: "Jimmy" }),
      });
    }
    db.services = DEFAULT_SERVICES.map((s) => ({ ...s }));
    db.professionals = DEFAULT_PROFESSIONALS.map((p) => ({ ...p }));
    db.schedule = SCHEDULE;
  });
}

/**
 * Para a coleção da API (`pnpm test:reset`): uma reserva de ontem de cada
 * profissional, do `cliente3`, com ids fixos. Os testes de domínio montam os
 * próprios dados e não usam isto.
 */
export async function seedAgenda() {
  const { updateDb } = await import("../app/_lib/db");
  const { addDays, nowInStudio } = await import("../app/_lib/availability");
  const yesterday = addDays(nowInStudio().date, -1);
  const base = { userId: USERS.cliente3.id, date: yesterday, time: "10:00" };
  await updateDb((db) => {
    db.reservations.push(
      { ...base, id: "seed-heitor", serviceId: "corte-heitor", professional: "Heitor", priceCents: 7000, note: "Semente da coleção" },
      { ...base, id: "seed-jimmy", serviceId: "corte-jimmy", professional: "Jimmy", priceCents: 6500 },
    );
  });
}

if (process.argv[1]?.endsWith("test-reset.ts")) {
  resetTestDb()
    .then(seedAgenda)
    .then(() => {
      console.log("Banco de teste zerado e semeado.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error.message ?? error);
      process.exit(1);
    });
}
