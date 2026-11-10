// CSV para abrir direto no Excel em português: separador ";" e BOM UTF-8
// (sem o BOM o Excel troca os acentos).

type Cell = string | number | null | undefined;

function cell(value: Cell) {
  const text = value === null || value === undefined ? "" : String(value);
  // Fórmulas ("=", "+", "-", "@") viram texto: evita injeção de fórmula ao abrir a planilha.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: Cell[][]) {
  return "﻿" + [header, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Valor em reais com vírgula, como número para a planilha somar. */
export const csvMoney = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
