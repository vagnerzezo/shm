import type { AvailabilityRules } from "./availability";
import { catalogOf } from "./catalog";
import { readDb } from "./db";

/** Funcionamento, períodos fechados e profissionais atuais, para calcular horários. */
export async function getAvailabilityRules(): Promise<AvailabilityRules> {
  const db = await readDb();
  return {
    settings: db.schedule,
    closures: db.closures,
    professionals: catalogOf(db).professionals.map((p) => p.name),
  };
}
