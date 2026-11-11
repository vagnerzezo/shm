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

const PASSWORD = "Teste#12345";
const login = (name, email, variable) => [
  `Login ${name}`, "POST", "/auth/login", {
    body: { email, password: PASSWORD },
    status: 200,
    tests: [
      'pm.test("devolve token, validade e usuário", () => { pm.expect(json.token).to.be.a("string").with.length.above(20); pm.expect(json.expiresAt).to.be.a("number"); pm.expect(json.user.email).to.eql("' + email + '"); pm.expect(json.user).to.not.have.property("passwordHash"); });',
      `pm.collectionVariables.set("${variable}", json.token);`,
    ],
  },
];
const isError = (code) => `pm.test("erro ${code}", () => { pm.expect(json.error.code).to.eql("${code}"); pm.expect(json.error.message).to.be.a("string").and.not.empty; });`;

const auth = [
  login("cliente", "cliente@shm.test", "clientToken"),
  login("cliente 2", "cliente2@shm.test", "client2Token"),
  login("admin", "admin@shm.test", "adminToken"),
  login("descartável", "cliente@shm.test", "throwawayToken"),
  ["Login com senha errada", "POST", "/auth/login", { body: { email: "cliente@shm.test", password: "errada" }, status: 401, tests: [isError("invalid_credentials")] }],
  ["Login com e-mail inexistente", "POST", "/auth/login", { body: { email: "ninguem@shm.test", password: "errada" }, status: 401, tests: [isError("invalid_credentials")] }],
  ["Login sem senha", "POST", "/auth/login", { body: { email: "cliente@shm.test" }, status: 400, tests: [isError("validation")] }],
  ["Login com JSON quebrado", "POST", "/auth/login", { body: "{", status: 400, tests: [isError("validation")] }],
  ["Quem sou eu", "GET", "/me", { auth: "clientToken", status: 200, tests: ['pm.test("é o cliente", () => { pm.expect(json.user.email).to.eql("cliente@shm.test"); pm.expect(json.user.role).to.eql("cliente"); });'] }],
  ["Quem sou eu (admin)", "GET", "/me", { auth: "adminToken", status: 200, tests: ['pm.test("é admin", () => pm.expect(json.user.role).to.eql("admin"));'] }],
  ["Quem sou eu sem token", "GET", "/me", { status: 401, tests: [isError("unauthenticated")] }],
  ["Quem sou eu com token inválido", "GET", "/me", { auth: "=Bearer lixo", status: 401, tests: [isError("unauthenticated")] }],
  ["Quem sou eu com cabeçalho sem Bearer", "GET", "/me", { auth: "=lixo", status: 401, tests: [isError("unauthenticated")] }],
  ["Sair", "POST", "/auth/logout", { auth: "throwawayToken", status: 204 }],
  ["Token usado depois de sair", "GET", "/me", { auth: "throwawayToken", status: 401, tests: [isError("unauthenticated")] }],
  ["Sair sem token", "POST", "/auth/logout", { status: 401 }],
];

export const folders = [
  ["Studio", studio],
  ["Auth", auth],
];
