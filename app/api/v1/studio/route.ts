import { handle } from "@/app/_lib/api/http";
import { studioJson } from "@/app/_lib/api/serialize";
import { getStudio } from "@/app/_lib/studio";

export const GET = handle(async () => studioJson(await getStudio()));
