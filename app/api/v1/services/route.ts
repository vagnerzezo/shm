import { handle } from "@/app/_lib/api/http";
import { serviceJson } from "@/app/_lib/api/serialize";
import { servicesByCategory } from "@/app/_lib/domain/catalog";

export const GET = handle(async () => {
  const { categories } = await servicesByCategory();
  return { categories: categories.map((c) => ({ name: c.name, services: c.services.map(serviceJson) })) };
});
