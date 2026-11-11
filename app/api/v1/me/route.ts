import { requireAuth } from "@/app/_lib/api/auth";
import { handle } from "@/app/_lib/api/http";
import { userJson } from "@/app/_lib/api/serialize";

export const GET = handle(async () => ({ user: userJson(await requireAuth()) }));
