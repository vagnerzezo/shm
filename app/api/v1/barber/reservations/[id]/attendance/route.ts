import { requireBarber } from "@/app/_lib/api/auth";
import { handle, noContent, readBody } from "@/app/_lib/api/http";
import type { Attendance } from "@/app/_lib/db";
import { setAttendanceFor } from "@/app/_lib/domain/barber";

type Ctx = { params: Promise<{ id: string }> };

// `compareceu`, `faltou` ou `null` (desfaz). Só reservas do próprio profissional, depois do horário.
export const PUT = handle(async (request, { params }: Ctx) => {
  const me = await requireBarber();
  const { id } = await params;
  const { attendance } = await readBody(request);
  // `undefined` (campo ausente) cai na validação do domínio.
  await setAttendanceFor(me, id, attendance as Attendance | null);
  return noContent();
});
