// Textos editáveis dos e-mails do sistema (Marketing → Templates → E-mails do
// sistema). Só o texto muda: o botão com o link, o card da reserva, o motivo do
// cancelamento e o rodapé continuam automáticos, então nenhum e-mail perde o
// que precisa (ex.: o link de redefinir senha).

export const EMAIL_KINDS = {
  "boas-vindas": "Boas-vindas",
  agendamento: "Agendamento realizado",
  cancelamento: "Agendamento cancelado",
  senha: "Redefinição de senha",
} as const;

export type EmailKind = keyof typeof EMAIL_KINDS;

export const isEmailKind = (v: unknown): v is EmailKind => typeof v === "string" && v in EMAIL_KINDS;

export type EmailTextField = "assunto" | "titulo" | "texto" | "textoEstudio" | "botao" | "observacoes";
export type EmailTexts = Record<EmailTextField, string>;
/** O que o admin mudou, por e-mail. Campo ausente = texto original. */
export type SystemEmailTexts = Partial<Record<EmailKind, Partial<EmailTexts>>>;

type FieldSpec = { label: string; hint?: string; rows?: number; max: number; required: boolean };

const FIELD: Record<Exclude<EmailTextField, "textoEstudio">, FieldSpec> = {
  assunto: { label: "Assunto", max: 150, required: true },
  titulo: { label: "Título", max: 100, required: true },
  texto: { label: "Texto", hint: "Uma linha em branco separa os parágrafos.", rows: 4, max: 2000, required: true },
  botao: { label: "Texto do botão", hint: "O link do botão é colocado pelo sistema.", max: 40, required: true },
  observacoes: { label: "Observações", hint: "Texto menor, depois do botão. Uma por linha.", rows: 3, max: 1000, required: false },
};

/** Marcadores aceitos em todos os e-mails. */
const COMMON = { nome: "primeiro nome do cliente", estudio: "nome do estúdio" };
const BOOKING = { servico: "nome do serviço", data: "data (ex.: 28 de novembro de 2026)", hora: "horário de início" };

export const EMAIL_TEXT_SPEC: Record<
  EmailKind,
  { fields: Partial<Record<EmailTextField, FieldSpec>>; vars: Record<string, string>; note?: string }
> = {
  "boas-vindas": {
    fields: { ...FIELD },
    vars: { ...COMMON, email: "e-mail de login" },
  },
  agendamento: {
    fields: { ...FIELD },
    vars: { ...COMMON, ...BOOKING },
    note: "Quando o cliente marca mais de um serviço de uma vez, o assunto, o título e o texto usam a versão no plural, automática. O botão e as observações valem sempre.",
  },
  cancelamento: {
    fields: {
      assunto: FIELD.assunto,
      titulo: FIELD.titulo,
      texto: { ...FIELD.texto, label: "Texto quando o cliente cancela" },
      textoEstudio: { ...FIELD.texto, label: "Texto quando o estúdio cancela", hint: "O motivo, quando informado, entra logo depois." },
      botao: FIELD.botao,
      observacoes: FIELD.observacoes,
    },
    vars: { ...COMMON, ...BOOKING },
  },
  senha: {
    fields: { ...FIELD },
    vars: { ...COMMON, validade: "por quanto tempo o link vale (ex.: 1 hora)" },
  },
};

export const DEFAULT_EMAIL_TEXTS: Record<EmailKind, EmailTexts> = {
  "boas-vindas": {
    assunto: "Boas-vindas ao {estudio}",
    titulo: "Boas-vindas, {nome}!",
    texto:
      "Obrigado por se cadastrar no {estudio}. Sua conta foi criada com sucesso e já está pronta para usar.\n\n" +
      "Pelo site você marca e remarca seus horários, acompanha suas reservas e conversa com o estúdio.",
    textoEstudio: "",
    botao: "Acessar minha conta",
    observacoes: "",
  },
  agendamento: {
    assunto: "Horário confirmado: {servico}, {data} às {hora}",
    titulo: "Agendamento confirmado",
    texto: "Olá, {nome}! Seu horário está marcado. Confira os detalhes:",
    textoEstudio: "",
    botao: "Ver meus agendamentos",
    observacoes: "Precisa mudar? Você pode remarcar ou cancelar pelo site, em Minhas reservas.",
  },
  cancelamento: {
    assunto: "Agendamento cancelado: {servico}, {data}",
    titulo: "Agendamento cancelado",
    texto: "Olá, {nome}. Confirmamos o cancelamento do seu horário abaixo.",
    textoEstudio: "Olá, {nome}. Precisamos cancelar o seu horário abaixo. Pedimos desculpas pelo transtorno.",
    botao: "Agendar novamente",
    observacoes: "Quer marcar outro dia? É só escolher um novo horário no site. Vai ser um prazer receber você.",
  },
  senha: {
    assunto: "Redefinir sua senha — {estudio}",
    titulo: "Redefinição de senha",
    texto:
      "Olá, {nome}. Recebemos um pedido para redefinir a senha da sua conta.\n\n" +
      "Clique no botão abaixo e escolha uma nova senha. Ao salvar, você entra automaticamente e sai dos outros aparelhos.",
    textoEstudio: "",
    botao: "Redefinir minha senha",
    observacoes:
      "Por segurança, o link vale por {validade} e só pode ser usado uma vez.\n" +
      "Não foi você? Pode ignorar este e-mail: sua senha continua a mesma.",
  },
};

/** Textos em uso: os do admin por cima dos originais. */
export function emailTexts(kind: EmailKind, custom?: Partial<EmailTexts>): EmailTexts {
  return { ...DEFAULT_EMAIL_TEXTS[kind], ...custom };
}

/** Troca `{marcador}` pelo valor; marcador desconhecido fica como está. */
export function fillVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (all, name: string) => vars[name] ?? all);
}

/** Parágrafos separados por linha em branco. */
export const paragraphsOf = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

/** Uma observação por linha. */
export const linesOf = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Confere o que o admin digitou e devolve só o que difere do original (o resto
 * segue o texto padrão, inclusive se ele mudar numa versão futura).
 */
export function validateEmailTexts(
  kind: EmailKind,
  input: Partial<Record<EmailTextField, string>>,
): { error: string; field: EmailTextField } | { texts: Partial<EmailTexts> } {
  const spec = EMAIL_TEXT_SPEC[kind];
  const texts: Partial<EmailTexts> = {};
  for (const [field, f] of Object.entries(spec.fields) as [EmailTextField, FieldSpec][]) {
    const value = (input[field] ?? "").replace(/\r\n/g, "\n").trim();
    if (f.required && !value) return { error: `Preencha “${f.label}”.`, field };
    if (value.length > f.max) return { error: `“${f.label}” pode ter até ${f.max} caracteres.`, field };
    const unknown = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).find((name) => !(name in spec.vars));
    if (unknown) {
      const allowed = Object.keys(spec.vars).map((v) => `{${v}}`).join(", ");
      return { error: `{${unknown}} não existe neste e-mail. Use: ${allowed}.`, field };
    }
    if (value !== DEFAULT_EMAIL_TEXTS[kind][field]) texts[field] = value;
  }
  return { texts };
}
