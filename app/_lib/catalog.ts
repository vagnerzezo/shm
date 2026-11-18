import { readDb, type Db } from "./db";
import { categoriesOf, DEFAULT_PROFESSIONALS, DEFAULT_SERVICES, isActiveService, type Professional, type Service } from "./services";

type DbLike = { services?: Service[]; professionals?: Professional[] };

/** Catálogo salvo no banco ou, se ainda não houver, o padrão. */
export function catalogOf(db: DbLike) {
  const services = db.services ?? DEFAULT_SERVICES;
  const professionals = db.professionals ?? DEFAULT_PROFESSIONALS;
  return { services, professionals, categories: categoriesOf(services.filter(isActiveService)) };
}

export async function getCatalog() {
  return catalogOf(await readDb());
}

/** Serviços que o cliente pode marcar. */
export async function getBookableServices() {
  return (await getCatalog()).services.filter(isActiveService);
}

/** Dentro de `updateDb`: copia o catálogo padrão para o banco na primeira alteração. */
export function ensureCatalog(db: Db) {
  const { services, professionals } = catalogOf(db);
  db.services ??= services.map((s) => ({ ...s }));
  db.professionals ??= professionals.map((p) => ({ ...p }));
  return { services: db.services, professionals: db.professionals };
}
