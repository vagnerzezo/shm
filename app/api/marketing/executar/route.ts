import { timingSafeEqual } from "node:crypto";
import { runMarketing } from "@/app/_lib/marketing";

// Para cron externo: POST com "Authorization: Bearer <CRON_SECRET>".
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET não configurado." }, { status: 503 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  return Response.json(await runMarketing());
}
