// Copia o banco antigo (.data/db.json) para o Postgres. Uso único:
//   npx drizzle-kit migrate && npx tsx scripts/importar-json.ts [caminho/do/db.json]
// Recusa rodar se o Postgres já tiver usuários, para não misturar dados.

import { readFileSync } from "node:fs";

process.loadEnvFile(".env");

async function main() {
  const file = process.argv[2] ?? ".data/db.json";
  const json = JSON.parse(readFileSync(file, "utf8"));
  const { readDb, updateDb } = await import("../app/_lib/db");
  const { DEFAULT_PROFESSIONALS, DEFAULT_SERVICES } = await import("../app/_lib/services");

  if ((await readDb()).users.length > 0) {
    console.error("O Postgres já tem usuários. Nada foi importado.");
    process.exit(1);
  }

  // Registros que apontam para um cliente que não existe mais não entram (o banco exige o cliente).
  const userIds = new Set<string>(json.users.map((u: { id: string }) => u.id));
  const skipped: string[] = [];
  const own = <T,>(name: string, list: T[] | undefined, owner: (item: T) => string) =>
    (list ?? []).filter((item) => userIds.has(owner(item)) || (skipped.push(name), false));

  await updateDb((db) => {
    db.users = json.users;
    db.sessions = own("sessão", json.sessions, (s) => s.userId);
    db.passwordResets = own("pedido de senha", json.passwordResets, (r) => r.userId);
    db.reservations = own("reserva", json.reservations, (r) => r.userId);
    db.messages = own("mensagem", json.messages, (m) => m.customerId);
    db.dispatches = own("envio", json.dispatches, (d) => d.customerId);
    db.templates = json.templates ?? [];
    db.rules = json.rules ?? [];
    db.closures = json.closures ?? [];
    // Sem catálogo salvo no JSON, grava o padrão (o banco não tem "ausente").
    db.services = json.services ?? DEFAULT_SERVICES;
    db.professionals = json.professionals ?? DEFAULT_PROFESSIONALS;
    if (json.schedule) db.schedule = json.schedule;
    if (json.marketing) db.marketing = json.marketing;
    if (json.studio) db.studio = json.studio;
  });

  const db = await readDb();
  const counts = Object.entries(db)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}: ${(v as unknown[]).length}`);
  console.log(`Importado de ${file}.\n${counts.join("\n")}`);
  if (skipped.length) console.log(`Ignorados por apontarem para cliente inexistente: ${skipped.join(", ")}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
