import { timingSafeEqual } from "node:crypto";
import { runMarketing } from "@/app/_lib/marketing";

// Roda o motor de marketing. Exige "Authorization: Bearer <CRON_SECRET>".
// GET: cron da Vercel (vercel.json), que manda esse cabeçalho sozinho quando
// CRON_SECRET está configurado. POST: outro cron externo.
async function execute(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET não configurado." }, { status: 503 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  return Response.json(await runMarketing());
}

export const GET = execute;
export const POST = execute;
