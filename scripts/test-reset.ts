// Zera o banco de TESTE e grava os dados fixos dos testes.
// Uso: pnpm test:reset (carrega o .env.test). Recusa rodar em outro banco.

import { sql } from "drizzle-orm";
import { SCHEDULE, USERS } from "../tests/fixtures";

export async function resetTestDb() {
  if (process.env.SHM_TEST_DB !== "1") {
    throw new Error("test-reset só roda com SHM_TEST_DB=1 (use o .env.test). Nada foi apagado.");
  }
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
      });
    }
    db.services = DEFAULT_SERVICES.map((s) => ({ ...s }));
    db.professionals = DEFAULT_PROFESSIONALS.map((p) => ({ ...p }));
    db.schedule = SCHEDULE;
  });
}

if (process.argv[1]?.endsWith("test-reset.ts")) {
  resetTestDb()
    .then(() => {
      console.log("Banco de teste zerado e semeado.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error.message ?? error);
      process.exit(1);
    });
}
