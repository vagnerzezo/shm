import { addDays, isRealDate } from "../availability";
import { DomainError } from "../errors";

// Leitura de parâmetros de query das rotas /api/v1.

const invalid = (field: string, message: string) => new DomainError("validation", message, { [field]: message });

/** "AAAA-MM-DD" de um dia que existe; senão, erro de validação no campo. */
export function parseDate(value: unknown, field: string): string {
  if (!isRealDate(value)) throw invalid(field, "Informe uma data válida (AAAA-MM-DD).");
  return value;
}

/** Intervalo de datas, `from` até `to` inclusive, com no máximo `maxDays` dias. */
export function parseRange(from: unknown, to: unknown, maxDays = 31): { from: string; to: string } {
  const start = parseDate(from, "from");
  const end = parseDate(to, "to");
  if (end < start) throw invalid("to", "A data final deve ser igual ou depois da inicial.");
  if (end > addDays(start, maxDays - 1)) throw invalid("to", `Consulte no máximo ${maxDays} dias por vez.`);
  return { from: start, to: end };
}

/** Parâmetro de query: texto ou `undefined` (vazio conta como ausente). */
export function queryParam(url: URL, name: string): string | undefined {
  return url.searchParams.get(name) || undefined;
}
