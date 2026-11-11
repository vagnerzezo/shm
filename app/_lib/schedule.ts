import type { AvailabilityRules } from "./availability";
import { catalogOf } from "./catalog";
import { readDb, type Db } from "./db";

/** Funcionamento, períodos fechados e profissionais de um estado do banco. */
export function rulesOf(db: Pick<Db, "schedule" | "closures" | "services" | "professionals">): AvailabilityRules {
  return {
    settings: db.schedule,
    closures: db.closures,
    professionals: catalogOf(db).professionals.map((p) => p.name),
  };
}

/** As regras atuais, para calcular horários. */
export async function getAvailabilityRules(): Promise<AvailabilityRules> {
  return rulesOf(await readDb());
}
