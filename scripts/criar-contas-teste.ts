// Cria (ou recria a senha de) uma conta de cliente e uma de admin no banco
// (Postgres do DATABASE_URL). As senhas são geradas aqui e gravadas em
// .data/contas-teste.txt, que fica fora do git.
//
// Uso: npx tsx scripts/criar-contas-teste.ts

import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

process.loadEnvFile(".env");

const DIR = path.join(process.cwd(), ".data");
const CREDENTIALS = path.join(DIR, "contas-teste.txt");

const accounts = [
  { name: "Cliente Teste", email: "cliente@shm.test", phone: "51900000001", role: undefined },
  { name: "Admin Teste", email: "admin@shm.test", phone: "51900000002", role: "admin" as const },
];

// Mesmo formato de app/_lib/auth.ts: "salt:hash" com scrypt de 64 bytes.
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const { updateDb } = await import("../app/_lib/db");
  const lines: string[] = [];
  await updateDb((db) => {
    for (const account of accounts) {
      const password = randomBytes(9).toString("base64url");
      const passwordHash = hashPassword(password);
      const existing = db.users.find((u) => u.email === account.email);
      if (existing) {
        Object.assign(existing, { passwordHash, role: account.role });
      } else {
        db.users.push({
          id: randomUUID(),
          name: account.name,
          phone: account.phone,
          email: account.email,
          passwordHash,
          createdAt: new Date().toISOString(),
          ...(account.role && { role: account.role }),
        });
      }
      lines.push(`${account.role === "admin" ? "Admin  " : "Cliente"}  ${account.email}  ${password}`);
    }
  });

  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(CREDENTIALS, `${lines.join("\n")}\n`, { mode: 0o600 });
  console.log(`Contas prontas. Logins e senhas em ${path.relative(process.cwd(), CREDENTIALS)}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
