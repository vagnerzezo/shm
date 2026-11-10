import { getCurrentUser } from "@/app/_lib/auth";
import { nowInStudio } from "@/app/_lib/availability";
import { csvMoney, csvResponse, toCsv } from "@/app/_lib/csv";
import { getCustomers } from "@/app/_lib/customers";

const br = (date: string) => date.slice(0, 10).split("-").reverse().join("/");

/** Todos os clientes em CSV. */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Não autorizado.", { status: 401 });

  const customers = (await getCustomers()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const csv = toCsv(
    [
      "Nome",
      "Telefone",
      "E-mail",
      "Cliente desde",
      "Visitas",
      "Faltas",
      "Total gasto (R$)",
      "Última visita",
      "Próximo horário",
      "Aceita e-mail",
      "Aceita mensagem",
      "Situação",
    ],
    customers.map((c) => [
      c.name,
      c.phone,
      c.email,
      br(c.createdAt),
      c.visits,
      c.missed,
      csvMoney(c.spentCents),
      c.lastVisit ? br(c.lastVisit.date) : "",
      c.nextBooking ? `${br(c.nextBooking.date)} ${c.nextBooking.time}` : "",
      c.consent.email ? "Sim" : "Não",
      c.consent.mensagem ? "Sim" : "Não",
      c.disabledAt ? "Desativado" : "Ativo",
    ]),
  );
  return csvResponse(csv, `clientes-${nowInStudio().date}.csv`);
}
