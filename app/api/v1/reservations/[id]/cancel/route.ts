import { after } from "next/server";
import { requireAuth } from "@/app/_lib/api/auth";
import { handle, noContent } from "@/app/_lib/api/http";
import { cancelForCustomer } from "@/app/_lib/domain/bookings";
import { sendBookingCancelledEmail } from "@/app/_lib/email-templates/send";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_request, { params }: Ctx) => {
  const me = await requireAuth(["cliente"]);
  const { id } = await params;
  const before = await cancelForCustomer(me.id, id);
  after(() => sendBookingCancelledEmail(me.id, before, { byStudio: false }));
  return noContent();
});
