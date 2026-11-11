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

const NEW = { name: "Novo Pelo App", phone: "51977776666", email: "novo.app@shm.test", password: "senha-do-app-1", consent: { email: false, mensagem: true } };
const account = [
  ["Cadastro", "POST", "/auth/register", {
    body: NEW, status: 201,
    tests: [
      'pm.test("devolve sessão do novo cliente", () => { pm.expect(json.token).to.be.a("string"); pm.expect(json.user.email).to.eql("novo.app@shm.test"); pm.expect(json.user.role).to.eql("cliente"); pm.expect(json.user.consent).to.eql({ email: false, mensagem: true }); });',
      'pm.collectionVariables.set("newToken", json.token);',
    ],
  }],
  ["Cadastro com e-mail repetido", "POST", "/auth/register", { body: NEW, status: 409, tests: [isError("email_taken")] }],
  ["Cadastro com senha curta", "POST", "/auth/register", { body: { ...NEW, email: "x@shm.test", password: "1234567" }, status: 400, tests: [isError("validation"), 'pm.test("aponta o campo", () => pm.expect(json.error.fields.password).to.be.a("string"));'] }],
  ["Cadastro com nome de tipo errado", "POST", "/auth/register", { body: { ...NEW, email: "x@shm.test", name: 123 }, status: 400, tests: [isError("validation")] }],
  ["Esqueci a senha (e-mail com conta)", "POST", "/auth/password/forgot", { body: { email: "novo.app@shm.test" }, status: 204, tests: ['pm.test("sem corpo", () => pm.expect(pm.response.text()).to.eql(""));'] }],
  ["Esqueci a senha (e-mail sem conta)", "POST", "/auth/password/forgot", { body: { email: "ninguem@shm.test" }, status: 204, tests: ['pm.test("sem corpo", () => pm.expect(pm.response.text()).to.eql(""));'] }],
  ["Esqueci a senha (e-mail inválido)", "POST", "/auth/password/forgot", { body: { email: "nada" }, status: 400, tests: [isError("validation")] }],
  ["Redefinir com código inválido", "POST", "/auth/password/reset", { body: { token: "nao-existe", password: "outra-senha-1" }, status: 400, tests: [isError("validation")] }],
  ["Trocar o nome", "PATCH", "/me", { auth: "newToken", body: { name: "Novo Renomeado" }, status: 200, tests: ['pm.test("nome novo, resto igual", () => { pm.expect(json.user.name).to.eql("Novo Renomeado"); pm.expect(json.user.email).to.eql("novo.app@shm.test"); pm.expect(json.user.phone).to.eql("51977776666"); });'] }],
  ["Trocar para e-mail de outra conta", "PATCH", "/me", { auth: "newToken", body: { email: "cliente@shm.test" }, status: 409, tests: [isError("email_taken")] }],
  ["Trocar dados sem token", "PATCH", "/me", { body: { name: "X Y" }, status: 401 }],
  ["Trocar senha com a atual errada", "POST", "/me/password", { auth: "newToken", body: { current: "errada", password: "senha-do-app-2" }, status: 400, tests: [isError("validation")] }],
  ["Trocar senha", "POST", "/me/password", { auth: "newToken", body: { current: NEW.password, password: "senha-do-app-2" }, status: 204 }],
  ["Token atual continua valendo", "GET", "/me", { auth: "newToken", status: 200 }],
  ["Login com a senha nova", "POST", "/auth/login", { body: { email: NEW.email, password: "senha-do-app-2" }, status: 200 }],
  ["Login com a senha antiga", "POST", "/auth/login", { body: { email: NEW.email, password: NEW.password }, status: 401 }],
  ["Admin não exclui a conta pela API", "DELETE", "/me", { auth: "adminToken", body: { password: PASSWORD }, status: 403, tests: [isError("forbidden")] }],
  ["Excluir conta com senha errada", "DELETE", "/me", { auth: "newToken", body: { password: "errada" }, status: 400, tests: [isError("validation")] }],
  ["Excluir conta", "DELETE", "/me", { auth: "newToken", body: { password: "senha-do-app-2" }, status: 204 }],
  ["Token da conta excluída", "GET", "/me", { auth: "newToken", status: 401 }],
];

export const folders = [
  ["Studio", studio],
  ["Auth", auth],
  ["Account", account],
];
