// Requisições e verificações da API v1, na ordem em que rodam.
// Formato em build-collection.mjs.

const studio = [
  ["Dados do estúdio", "GET", "/studio", {
    status: 200,
    tests: [
      'pm.test("tem nome e endereço", () => { pm.expect(json.name).to.be.a("string"); pm.expect(json.address).to.be.an("array"); });',
    ],
  }],
  ["Método não suportado", "POST", "/studio", { status: 405 }],
];

export const folders = [["Studio", studio]];
