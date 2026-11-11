import type { StudioInfo } from "../db";

// Formato público (JSON da API) dos objetos internos.

export function studioJson(studio: StudioInfo) {
  return {
    name: studio.name,
    address: studio.address,
    phone: studio.phone,
    ...(studio.email && { email: studio.email }),
    ...(studio.social && { social: studio.social }),
  };
}
