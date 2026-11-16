import { handle } from "@/app/_lib/api/http";
import { parseRange, queryParam } from "@/app/_lib/api/params";
import { getCurrentUser } from "@/app/_lib/auth";
import { availabilityFor } from "@/app/_lib/domain/catalog";
import { DomainError } from "@/app/_lib/errors";

// Público. Com login, as reservas do próprio cliente contam como ocupadas.
export const GET = handle(async (request) => {
  const url = new URL(request.url);
  const serviceId = queryParam(url, "serviceId");
  if (!serviceId) {
    const message = "Informe o serviço.";
    throw new DomainError("validation", message, { serviceId: message });
  }
  const range = parseRange(queryParam(url, "from"), queryParam(url, "to"));
  const user = await getCurrentUser();
  return availabilityFor({ serviceId, ...range, userId: user?.id, rescheduleOf: queryParam(url, "rescheduleOf") });
});
