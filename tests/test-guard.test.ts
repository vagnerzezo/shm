import assert from "node:assert/strict";
import { test } from "node:test";
import { resetTestDb } from "../scripts/test-reset";

// Se o shell já tiver o DATABASE_URL do banco principal, o `--env-file` não o
// substitui. O reset tem que recusar antes de conectar, e não só olhar o SHM_TEST_DB.
test("reset recusa quando o DATABASE_URL não é o do .env.test", async () => {
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://user:senha@banco-principal.invalid/neondb";
  try {
    await assert.rejects(resetTestDb(), /não é o banco de teste/);
  } finally {
    process.env.DATABASE_URL = original;
  }
});
