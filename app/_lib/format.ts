// "51999991234" -> "(51) 99999-1234"
export function formatPhone(digits: string) {
  const match = digits.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

/** "2026-11-06" (ou ISO completo) -> "6 de nov. de 2026". */
export function shortDate(date: string, { year = true } = {}) {
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** Para busca sem acento e sem maiúsculas. */
export function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Valor de um parâmetro de busca da URL, já sem espaços. */
export function oneParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}
