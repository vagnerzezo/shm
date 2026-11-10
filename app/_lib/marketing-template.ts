import type { Channel } from "./db";

// Variáveis dos templates. Sem dependências de servidor: o formulário usa
// as mesmas regras para a prévia.

export const channelLabel: Record<Channel, string> = { email: "E-mail", mensagem: "Mensagem" };

export const variables = [
  { key: "nome", label: "Nome do cliente", sample: "Ana Paula Ribeiro" },
  { key: "primeiro_nome", label: "Primeiro nome", sample: "Ana" },
  { key: "ultima_visita", label: "Data da última visita", sample: "3 de outubro de 2026" },
  { key: "dias_sem_visita", label: "Dias desde a última visita", sample: "20" },
  { key: "ultimo_servico", label: "Último serviço", sample: "Corte com Heitor" },
  { key: "profissional", label: "Profissional do último atendimento", sample: "Heitor" },
  { key: "link_agendamento", label: "Link para agendar", sample: "https://seu-site.com/agendamento" },
  { key: "estudio", label: "Nome do estúdio", sample: "Studio Heitor Macks" },
] as const;

export type VariableKey = (typeof variables)[number]["key"];

export const sampleValues = Object.fromEntries(variables.map((v) => [v.key, v.sample])) as Record<
  VariableKey,
  string
>;

const VARIABLE_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Troca `{{nome}}` pelos valores; variável desconhecida fica como está. */
export function renderTemplate(text: string, values: Record<string, string>) {
  return text.replace(VARIABLE_RE, (match, key: string) => values[key] ?? match);
}

export function unknownVariables(text: string) {
  const known = new Set<string>(variables.map((v) => v.key));
  return [...new Set([...text.matchAll(VARIABLE_RE)].map((m) => m[1]))].filter((k) => !known.has(k));
}

export const LIMITS = { name: 60, subject: 150, body: { email: 20000, mensagem: 1000 } } as const;
