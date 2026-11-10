import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_SCHEDULE } from "./availability";

// Banco simulado num arquivo JSON até existir um backend. Funciona em
// `next dev` / `next start` com disco local; não serve para serverless.

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
};

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
};

// Chaves que vieram depois: arquivos antigos não as têm.
const empty = (): Db => ({
  users: [],
  sessions: [],
  reservations: [],
  messages: [],
  templates: [],
  rules: [],
  dispatches: [],
  marketing: { email: { enabled: false }, mensagem: { enabled: false } },
  schedule: DEFAULT_SCHEDULE,
  closures: [],
});

const FILE = path.join(process.cwd(), ".data", "db.json");

export async function readDb(): Promise<Db> {
  try {
    return { ...empty(), ...(JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<Db>) };
  } catch {
    return empty();
  }
}

// Escritas em fila, para duas requisições não sobrescreverem uma à outra.
let queue: Promise<unknown> = Promise.resolve();

export function updateDb<T>(change: (db: Db) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = change(db);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db, null, 2));
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
