import { bigint, boolean, date, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Tabelas do Postgres (Neon). Os nomes das propriedades são os mesmos dos
// tipos em `db.ts`, e as colunas ficam em snake_case (`casing` no drizzle.config).
// `seq` guarda a ordem de inserção: as listas do sistema dependem dela
// (ex.: ordem dos serviços no catálogo) e não fazem parte dos tipos.

const seq = () => integer().generatedAlwaysAsIdentity();
const ts = () => timestamp({ withTimezone: true, mode: "date" });
const day = () => date({ mode: "string" });

export const users = pgTable("users", {
  seq: seq(),
  id: text().primaryKey(),
  name: text().notNull(),
  phone: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  createdAt: ts().notNull(),
  role: text(),
  consent: jsonb(),
  adminNote: text(),
  disabledAt: ts(),
  unsubscribeToken: text().unique(),
});

const userRef = () => text().notNull().references(() => users.id, { onDelete: "cascade" });

export const sessions = pgTable("sessions", {
  seq: seq(),
  token: text().primaryKey(),
  userId: userRef(),
  expiresAt: bigint({ mode: "number" }).notNull(),
});

export const passwordResets = pgTable("password_resets", {
  seq: seq(),
  tokenHash: text().primaryKey(),
  userId: userRef(),
  createdAt: bigint({ mode: "number" }).notNull(),
  expiresAt: bigint({ mode: "number" }).notNull(),
  usedAt: bigint({ mode: "number" }),
});

export const services = pgTable("services", {
  seq: seq(),
  id: text().primaryKey(),
  name: text().notNull(),
  category: text().notNull(),
  professional: text(),
  durationMinutes: integer().notNull(),
  priceCents: integer().notNull(),
  active: boolean(),
});

export const professionals = pgTable("professionals", {
  seq: seq(),
  name: text().primaryKey(),
  color: text().notNull(),
});

export const reservations = pgTable(
  "reservations",
  {
    seq: seq(),
    id: text().primaryKey(),
    // Sem chave estrangeira para `services`: o catálogo pode ser o padrão, que não fica no banco.
    userId: userRef(),
    serviceId: text().notNull(),
    date: day().notNull(),
    time: text().notNull(),
    note: text(),
    attendance: text(),
    priceCents: integer(),
    createdBy: text(),
    professional: text(),
    cancelledAt: ts(),
    cancelledBy: text(),
    cancelReason: text(),
  },
  (t) => [index().on(t.date), index().on(t.userId)],
);

export const messages = pgTable(
  "messages",
  {
    seq: seq(),
    id: text().primaryKey(),
    customerId: userRef(),
    from: text().notNull(),
    text: text().notNull(),
    createdAt: ts().notNull(),
    readAt: ts(),
  },
  (t) => [index().on(t.customerId)],
);

export const templates = pgTable("templates", {
  seq: seq(),
  id: text().primaryKey(),
  name: text().notNull(),
  channel: text().notNull(),
  subject: text(),
  body: text().notNull(),
  active: boolean().notNull(),
  isDefault: boolean().notNull(),
  createdAt: ts().notNull(),
  updatedAt: ts().notNull(),
});

export const rules = pgTable("rules", {
  seq: seq(),
  id: text().primaryKey(),
  channel: text().notNull(),
  name: text().notNull(),
  daysAfter: integer().notNull(),
  templateId: text(),
  active: boolean().notNull(),
  activeSince: ts().notNull(),
  createdAt: ts().notNull(),
});

export const dispatches = pgTable(
  "dispatches",
  {
    seq: seq(),
    id: text().primaryKey(),
    key: text().notNull(),
    customerId: userRef(),
    channel: text().notNull(),
    ruleId: text().notNull(),
    ruleName: text().notNull(),
    lastVisitId: text().notNull(),
    lastVisitDate: day().notNull(),
    dueDate: day().notNull(),
    status: text().notNull(),
    templateId: text(),
    templateName: text(),
    subject: text(),
    body: text(),
    reason: text(),
    sentAt: ts(),
    createdAt: ts().notNull(),
    updatedAt: ts().notNull(),
  },
  (t) => [index().on(t.customerId), index().on(t.status)],
);

export const closures = pgTable("closures", {
  seq: seq(),
  id: text().primaryKey(),
  start: day().notNull(),
  end: day().notNull(),
  professional: text(),
  reason: text().notNull(),
  createdAt: ts().notNull(),
});

/** Configurações únicas: `schedule`, `marketing` e `studio`. */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
});
