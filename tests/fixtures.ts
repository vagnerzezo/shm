import { DomainError } from "../app/_lib/errors";

// Contas do banco de teste (branch `teste` do Neon). Só valem lá.

export const PASSWORD = "Teste#12345";

const user = (id: string, name: string, phone: string) => ({
  id: `test-${id}`,
  name,
  email: `${id}@shm.test`,
  phone,
  password: PASSWORD,
});

export const USERS = {
  cliente: user("cliente", "Cliente Teste", "51900000001"),
  cliente2: user("cliente2", "Cliente Dois", "51900000002"),
  heitor: user("heitor", "Heitor Teste", "51900000003"),
  jimmy: user("jimmy", "Jimmy Teste", "51900000004"),
  admin: user("admin", "Admin Teste", "51900000005"),
};

/** Aberto todos os dias, 09:00–18:00 de 30 em 30 min: 19 horários por dia. */
export const SCHEDULE = {
  openWeekdays: [0, 1, 2, 3, 4, 5, 6],
  openTime: "09:00",
  lastStartTime: "18:00",
  stepMinutes: 30,
  maxDaysAhead: 90,
  minNoticeMinutes: 0,
};

/** Para `assert.rejects`: erro de domínio com esse código (e, se dado, apontando o campo). */
export const rejectsWith = (code: string, field?: string) => (e: unknown) =>
  e instanceof DomainError && e.code === code && (!field || Boolean(e.fields?.[field]));
