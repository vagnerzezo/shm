import { requireBarber } from "@/app/_lib/api/auth";
import { handle } from "@/app/_lib/api/http";
import { parseRange, queryParam } from "@/app/_lib/api/params";
import { barberReservationJson } from "@/app/_lib/api/serialize";
import { nowInStudio } from "@/app/_lib/availability";
import { getBarberAgenda } from "@/app/_lib/domain/barber";

// Horários do próprio profissional (até 31 dias), sem preço nem e-mail do cliente.
export const GET = handle(async (request) => {
  const me = await requireBarber();
  const url = new URL(request.url);
  const { from, to } = parseRange(queryParam(url, "from"), queryParam(url, "to"));
  const now = nowInStudio();
  const reservations = await getBarberAgenda(me.professional, from, to);
  return { professional: me.professional, reservations: reservations.map((r) => barberReservationJson(r, now)) };
});
