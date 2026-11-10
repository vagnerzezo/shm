import { readDb, type StudioInfo } from "./db";

export const DEFAULT_STUDIO: StudioInfo = {
  name: "Studio Heitor Macks",
  address: ["R. João XXIII, 32 Sala 1601", "São José, São Leopoldo", "RS, 93040-090, Brasil"],
  phone: "",
};

export function studioOf(db: { studio?: StudioInfo }): StudioInfo {
  return db.studio ?? DEFAULT_STUDIO;
}

export async function getStudio() {
  return studioOf(await readDb());
}
