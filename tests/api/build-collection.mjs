// Gera tests/api/shm-api-v1.postman_collection.json a partir da lista abaixo.
// Uso: node tests/api/build-collection.mjs (o `pnpm test:api` já roda antes dos testes).
//
// Cada item: [nome, método, caminho, opções]. Opções:
//   auth: nome da variável com o token | body: objeto JSON ou texto cru
//   status: status esperado | tests: linhas de JS (têm `json` = corpo já lido)
//   pre: linhas de JS antes da requisição

import { writeFileSync } from "node:fs";
import { folders } from "./requests.mjs";

const toItem = ([name, method, path, o = {}]) => {
  const tests = [
    `pm.test("status ${o.status}", () => pm.response.to.have.status(${o.status}));`,
    ...(o.tests?.length
      ? ["let json; try { json = pm.response.json(); } catch { json = undefined; }", ...o.tests]
      : []),
  ];
  const header = [];
  // `auth: "variavel"` manda Bearer {{variavel}}; `auth: "=texto"` manda o cabeçalho cru.
  if (o.auth) header.push({ key: "Authorization", value: o.auth.startsWith("=") ? o.auth.slice(1) : `Bearer {{${o.auth}}}` });
  if (o.body !== undefined) header.push({ key: "Content-Type", value: "application/json" });
  const [pathname, query] = path.split("?");
  return {
    name,
    event: [
      ...(o.pre ? [{ listen: "prerequest", script: { type: "text/javascript", exec: o.pre } }] : []),
      { listen: "test", script: { type: "text/javascript", exec: tests } },
    ],
    request: {
      method,
      header,
      ...(o.body !== undefined && {
        body: { mode: "raw", raw: typeof o.body === "string" ? o.body : JSON.stringify(o.body) },
      }),
      url: { raw: `{{baseUrl}}${path}`, host: ["{{baseUrl}}"], path: pathname.split("/").filter(Boolean), ...(query && { query: query.split("&").map((p) => { const [key, ...v] = p.split("="); return { key, value: v.join("=") }; }) }) },
    },
  };
};

const collection = {
  info: {
    name: "SHM API v1",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: folders.map(([name, items]) => ({ name, item: items.map(toItem) })),
};

writeFileSync(new URL("./shm-api-v1.postman_collection.json", import.meta.url), `${JSON.stringify(collection, null, 2)}\n`);
