import type { AvailabilityRules } from "./availability";
import { readDb } from "./db";

/** Funcionamento e períodos fechados atuais, para calcular horários. */
export async function getAvailabilityRules(): Promise<AvailabilityRules> {
  const db = await readDb();
  return { settings: db.schedule, closures: db.closures };
}
