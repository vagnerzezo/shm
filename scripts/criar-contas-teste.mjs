// Cria (ou recria a senha de) uma conta de cliente e uma de admin no banco
// local. As senhas são geradas aqui e gravadas em .data/contas-teste.txt,
// que fica fora do git.
//
// Uso: node scripts/criar-contas-teste.mjs

import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "db.json");
const CREDENTIALS = path.join(DIR, "contas-teste.txt");

const accounts = [
  { name: "Cliente Teste", email: "cliente@shm.test", phone: "51900000001", role: undefined },
  { name: "Admin Teste", email: "admin@shm.test", phone: "51900000002", role: "admin" },
];

// Mesmo formato de app/_lib/auth.ts: "salt:hash" com scrypt de 64 bytes.
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

let db;
try {
  db = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  db = { users: [], sessions: [], reservations: [], messages: [] };
}
db.messages ??= [];

const lines = [];
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

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
fs.writeFileSync(CREDENTIALS, `${lines.join("\n")}\n`, { mode: 0o600 });
console.log(`Contas prontas. Logins e senhas em ${path.relative(process.cwd(), CREDENTIALS)}`);
