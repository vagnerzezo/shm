import { getCurrentUser } from "@/app/_lib/auth";
import { nowInStudio } from "@/app/_lib/availability";
import { csvMoney, csvResponse, toCsv } from "@/app/_lib/csv";
import { filterHistory, parseFilters } from "@/app/_lib/history";
import { getAgenda, statusOf } from "@/app/_lib/reservations";

const statusLabel = { agendado: "Agendado", realizado: "Realizado", faltou: "Faltou" } as const;

/** Histórico em CSV, com os mesmos filtros da tela (vêm na URL). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Não autorizado.", { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const now = nowInStudio();
  const rows = filterHistory(await getAgenda(), parseFilters(params), now);

  const csv = toCsv(
    ["Data", "Horário", "Cliente", "Telefone", "E-mail", "Serviço", "Profissional", "Valor (R$)", "Situação", "Observação"],
    rows.map((r) => [
      r.date.split("-").reverse().join("/"),
      r.time,
      r.customer.name,
      r.customer.phone,
      r.customer.email,
      r.service.name,
      r.service.professional ?? "",
      csvMoney(r.service.priceCents),
      statusLabel[statusOf(r, now)],
      r.note ?? "",
    ]),
  );
  return csvResponse(csv, `historico-${now.date}.csv`);
}
