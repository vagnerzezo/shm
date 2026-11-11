import { eq, getTableColumns, getTableName, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { DEFAULT_SCHEDULE } from "./availability";
import * as t from "./db-schema";

// Tipos do banco e acesso ao Postgres. Tabelas em `db-schema.ts`.

export type Role = "admin" | "cliente";

export type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  /** Ausente = cliente. */
  role?: Role;
  /** Autorização para comunicações de marketing. Ausente = não autorizou. */
  consent?: Consent;
  /** Observações internas do estúdio; o cliente não vê. */
  adminNote?: string;
  /** Preenchido quando o admin desativa a conta: não entra, não marca, não recebe marketing. */
  disabledAt?: string;
  /** Código do link "deixar de receber" dos e-mails de marketing. */
  unsubscribeToken?: string;
};

/** Pedido de "esqueci minha senha". Guarda só o hash do código enviado por e-mail. */
export type PasswordReset = {
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
};

/** Funcionamento do estúdio, editável em /admin/configuracoes. */
export type ScheduleSettings = {
  /** 0 = domingo. */
  openWeekdays: number[];
  /** "HH:MM" */
  openTime: string;
  /** Último horário em que um atendimento pode começar. */
  lastStartTime: string;
  stepMinutes: number;
  /** Até quantos dias à frente o cliente pode marcar. */
  maxDaysAhead: number;
  /** Antecedência mínima, em minutos, para marcar no mesmo dia. */
  minNoticeMinutes: number;
};

/** Período sem atendimento (férias, feriado...). `professional` ausente = estúdio todo. */
export type Closure = {
  id: string;
  /** AAAA-MM-DD, inclusive. */
  start: string;
  end: string;
  professional?: string;
  reason: string;
  createdAt: string;
};

export type Channel = "email" | "mensagem";

export type Consent = Record<Channel, boolean>;

export type Template = {
  id: string;
  name: string;
  channel: Channel;
  /** Só para e-mail. */
  subject?: string;
  body: string;
  active: boolean;
  /** Um por canal, no máximo. */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

/** "Após N dias sem novo agendamento, enviar o template X." Cada regra pertence a um canal só. */
export type SendRule = {
  id: string;
  channel: Channel;
  name: string;
  daysAfter: number;
  /** `null` usa o template padrão do canal no momento do envio. */
  templateId: string | null;
  active: boolean;
  /** Quando foi ligada ou teve o prazo alterado: a regra não age sobre ausências anteriores. */
  activeSince: string;
  createdAt: string;
};

export type DispatchStatus = "pendente" | "enviando" | "enviado" | "falha" | "cancelado";

/** Um envio de uma regra para um cliente, num ciclo de ausência. */
export type Dispatch = {
  id: string;
  /** cliente + regra + reserva da última visita: o mesmo envio nunca se repete. */
  key: string;
  customerId: string;
  channel: Channel;
  ruleId: string;
  ruleName: string;
  lastVisitId: string;
  lastVisitDate: string;
  /** Data (AAAA-MM-DD) em que o envio vence. */
  dueDate: string;
  status: DispatchStatus;
  templateId?: string;
  templateName?: string;
  subject?: string;
  body?: string;
  /** Motivo da falha ou do cancelamento. */
  reason?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChannelSettings = { enabled: boolean; enabledSince?: string };

export type MarketingSettings = Record<Channel, ChannelSettings> & { lastRunAt?: string };

export type Session = { token: string; userId: string; expiresAt: number };

/** Ausente = ainda não marcado: conta como compareceu depois que o horário passa. */
export type Attendance = "compareceu" | "faltou";

export type StoredReservation = {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  time: string;
  note?: string;
  /** Marcado pelo admin depois do horário. */
  attendance?: Attendance;
  /** Preço na hora da reserva. Ausente em reservas antigas: vale o preço atual do serviço. */
  priceCents?: number;
  /** Reserva criada pelo estúdio (cliente ligou ou chegou sem marcar). */
  createdBy?: "admin";
  /**
   * Quem atende. Gravado na marcação; nos serviços sem profissional fixo, é o
   * escolhido entre os livres. Ausente em reservas antigas: vale o do serviço.
   */
  professional?: string;
  /** Cancelada: sai da agenda e libera o horário, mas fica no histórico. */
  cancelledAt?: string;
  cancelledBy?: Role;
  /** Motivo informado pelo estúdio. */
  cancelReason?: string;
};

export type StoredService = {
  id: string;
  name: string;
  category: string;
  /** Nome do profissional; ausente = qualquer profissional do estúdio. */
  professional?: string;
  durationMinutes: number;
  priceCents: number;
  /** Inativo some do agendamento, mas continua nas reservas antigas. */
  active?: boolean;
};

export type ProfessionalColor = "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";

export type StoredProfessional = { name: string; color: ProfessionalColor };

/** Dados do estúdio exibidos no painel e nos e-mails. */
export type StudioInfo = {
  name: string;
  /** Até três linhas. */
  address: string[];
  phone: string;
  /** Contato exibido no rodapé dos e-mails. */
  email?: string;
  /** Links completos das redes (https://...). Ausente = não aparece nos e-mails. */
  social?: Partial<Record<SocialNetwork, string>>;
};

export type SocialNetwork = "instagram" | "facebook" | "linkedin";

/** Mensagem da conversa entre o estúdio e um cliente. */
export type ChatMessage = {
  id: string;
  customerId: string;
  from: Role;
  text: string;
  createdAt: string;
  /** Quando o destinatário abriu a conversa (o admin, se veio do cliente; o cliente, se veio do admin). */
  readAt?: string;
};

type Db = {
  users: User[];
  sessions: Session[];
  reservations: StoredReservation[];
  messages: ChatMessage[];
  templates: Template[];
  rules: SendRule[];
  dispatches: Dispatch[];
  marketing: MarketingSettings;
  schedule: ScheduleSettings;
  closures: Closure[];
  /** Ausentes em arquivos antigos: usam os padrões de `catalog.ts`. */
  services?: StoredService[];
  professionals?: StoredProfessional[];
  studio?: StudioInfo;
  passwordResets?: PasswordReset[];
};

const DEFAULT_MARKETING: MarketingSettings = { email: { enabled: false }, mensagem: { enabled: false } };

// ---------------------------------------------------------------------------
// Armazenamento no Postgres (Neon). `readDb` monta o banco inteiro numa
// consulta só; `updateDb` roda a mudança numa transação com trava e grava só
// as linhas que mudaram. As telas e ações continuam usando o formato `Db`.

const g = globalThis as unknown as { shmPool?: Pool };
// Um pool por processo (o `next dev` recarrega módulos, então fica no globalThis).
const pool = (g.shmPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));
const orm = drizzle(pool, { casing: "snake_case" });
type Tx = Parameters<Parameters<typeof orm.transaction>[0]>[0];

type ListField =
  | "users"
  | "sessions"
  | "passwordResets"
  | "services"
  | "professionals"
  | "reservations"
  | "messages"
  | "templates"
  | "rules"
  | "dispatches"
  | "closures";

/** Ordem de gravação: tabelas de quem os outros dependem primeiro (exclusões vão na ordem inversa). */
const LISTS: { field: ListField; table: PgTable; key: string; nulls?: string[] }[] = [
  { field: "users", table: t.users, key: "id" },
  { field: "sessions", table: t.sessions, key: "token" },
  { field: "passwordResets", table: t.passwordResets, key: "tokenHash" },
  { field: "services", table: t.services, key: "id" },
  { field: "professionals", table: t.professionals, key: "name" },
  { field: "reservations", table: t.reservations, key: "id" },
  { field: "messages", table: t.messages, key: "id" },
  { field: "templates", table: t.templates, key: "id" },
  // `templateId` é `null` (não ausente) quando a regra usa o template padrão.
  { field: "rules", table: t.rules, key: "id", nulls: ["templateId"] },
  { field: "dispatches", table: t.dispatches, key: "id" },
  { field: "closures", table: t.closures, key: "id" },
];

const SETTINGS = ["schedule", "marketing", "studio"] as const;

const snake = (name: string) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;
const fieldsOf = (table: PgTable) => Object.entries(getTableColumns(table)).filter(([prop]) => prop !== "seq");

/** Uma consulta que devolve todas as tabelas como JSON, já com os nomes das propriedades. */
const READ_SQL = (() => {
  const lists = LISTS.map(({ field, table }) => {
    const pairs = fieldsOf(table).map(([prop]) => `'${prop}', x.${quote(snake(prop))}`).join(", ");
    return `'${field}', (select coalesce(json_agg(json_build_object(${pairs}) order by x.seq), '[]'::json) from ${quote(getTableName(table))} x)`;
  });
  return `select json_build_object(${lists.join(", ")}, 'settings', (select coalesce(json_object_agg(key, value), '{}'::json) from settings)) as db`;
})();

type Row = Record<string, unknown>;

/** Linha do banco -> objeto do sistema: sem campos nulos e datas em ISO, como no JSON antigo. */
function fromRow(table: PgTable, row: Row, nulls: string[] = []) {
  const out: Row = {};
  for (const [prop, column] of fieldsOf(table)) {
    const value = row[prop];
    if (value === null || value === undefined) {
      if (nulls.includes(prop)) out[prop] = null;
      continue;
    }
    out[prop] = column.columnType === "PgTimestamp" ? new Date(value as string).toISOString() : value;
  }
  return out;
}

/** Objeto do sistema -> valores das colunas. */
function toRow(table: PgTable, obj: Row) {
  const out: Row = {};
  for (const [prop, column] of fieldsOf(table)) {
    const value = obj[prop];
    out[prop] = value === undefined || value === null ? null : column.columnType === "PgTimestamp" ? new Date(value as string) : value;
  }
  return out;
}

/** JSON com chaves em ordem e sem `undefined`, para comparar antes e depois. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

async function load(runner: Pick<Tx, "execute"> = orm): Promise<Db> {
  const result = await runner.execute(sql.raw(READ_SQL));
  const raw = (result.rows[0] as { db: Record<string, unknown> }).db;
  const lists = Object.fromEntries(
    LISTS.map(({ field, table, nulls }) => [field, (raw[field] as Row[]).map((row) => fromRow(table, row, nulls))]),
  ) as Record<ListField, unknown[]>;
  const settings = raw.settings as Partial<Pick<Db, (typeof SETTINGS)[number]>>;
  return {
    ...(lists as unknown as Pick<Db, Exclude<ListField, "services" | "professionals" | "passwordResets">>),
    passwordResets: lists.passwordResets as PasswordReset[],
    // Catálogo vazio = ainda não salvo: valem os padrões de `catalog.ts`.
    services: lists.services.length ? (lists.services as StoredService[]) : undefined,
    professionals: lists.professionals.length ? (lists.professionals as StoredProfessional[]) : undefined,
    schedule: settings.schedule ?? DEFAULT_SCHEDULE,
    marketing: settings.marketing ?? DEFAULT_MARKETING,
    studio: settings.studio,
  };
}

/** Grava a diferença entre `before` e `after`. */
async function save(tx: Tx, before: Db, after: Db) {
  const removals: (() => Promise<unknown>)[] = [];
  for (const { field, table, key } of LISTS) {
    const keyColumn = getTableColumns(table)[key];
    const old = new Map(((before[field] ?? []) as Row[]).map((r) => [String(r[key]), stable(r)]));
    const now = (after[field] ?? []) as Row[];
    const kept = new Set<string>();
    for (const obj of now) {
      const id = String(obj[key]);
      kept.add(id);
      const previous = old.get(id);
      if (previous === undefined) await tx.insert(table).values(toRow(table, obj));
      else if (previous !== stable(obj)) await tx.update(table).set(toRow(table, obj)).where(eq(keyColumn, id));
    }
    const gone = [...old.keys()].filter((id) => !kept.has(id));
    if (gone.length) removals.unshift(() => tx.delete(table).where(inArray(keyColumn, gone)));
  }
  for (const remove of removals) await remove();

  for (const name of SETTINGS) {
    const value = after[name];
    if (stable(value) === stable(before[name])) continue;
    if (value === undefined) await tx.delete(t.settings).where(eq(t.settings.key, name));
    else {
      await tx
        .insert(t.settings)
        .values({ key: name, value })
        .onConflictDoUpdate({ target: t.settings.key, set: { value } });
    }
  }
}

export async function readDb(): Promise<Db> {
  return load();
}

/**
 * Aplica `change` ao banco numa transação. A trava faz as gravações
 * acontecerem uma de cada vez, mesmo com vários servidores (serverless).
 */
export function updateDb<T>(change: (db: Db) => T): Promise<T> {
  return orm.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(7243001)`);
    const before = await load(tx);
    const db = structuredClone(before);
    const result = change(db);
    await save(tx, before, db);
    return result;
  });
}

/** Remove o cliente e tudo ligado a ele (LGPD). Chamar dentro de `updateDb`. */
export function purgeUser(db: Db, userId: string) {
  db.users = db.users.filter((u) => u.id !== userId);
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  db.reservations = db.reservations.filter((r) => r.userId !== userId);
  db.messages = db.messages.filter((m) => m.customerId !== userId);
  db.dispatches = db.dispatches.filter((d) => d.customerId !== userId);
  if (db.passwordResets) db.passwordResets = db.passwordResets.filter((r) => r.userId !== userId);
}
