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
  login("barbeiro", "heitor@shm.test", "barberToken"),
  login("descartável", "cliente@shm.test", "throwawayToken"),
  ["Login com senha errada", "POST", "/auth/login", { body: { email: "cliente@shm.test", password: "errada" }, status: 401, tests: [isError("invalid_credentials")] }],
  ["Login com e-mail inexistente", "POST", "/auth/login", { body: { email: "ninguem@shm.test", password: "errada" }, status: 401, tests: [isError("invalid_credentials")] }],
  ["Login sem senha", "POST", "/auth/login", { body: { email: "cliente@shm.test" }, status: 400, tests: [isError("validation")] }],
  ["Login com JSON quebrado", "POST", "/auth/login", { body: "{", status: 400, tests: [isError("validation")] }],
  ["Quem sou eu", "GET", "/me", { auth: "clientToken", status: 200, tests: ['pm.test("é o cliente", () => { pm.expect(json.user.email).to.eql("cliente@shm.test"); pm.expect(json.user.role).to.eql("cliente"); });'] }],
  ["Quem sou eu (admin)", "GET", "/me", { auth: "adminToken", status: 200, tests: ['pm.test("é admin", () => pm.expect(json.user.role).to.eql("admin"));'] }],
  ["Quem sou eu (barbeiro)", "GET", "/me", { auth: "barberToken", status: 200, tests: ['pm.test("é barbeiro do Heitor", () => { pm.expect(json.user.role).to.eql("barbeiro"); pm.expect(json.user.professional).to.eql("Heitor"); });'] }],
  ["Admin sem profissional não tem o campo", "GET", "/me", { auth: "adminToken", status: 200, tests: ['pm.test("sem professional", () => pm.expect(json.user).to.not.have.property("professional"));'] }],
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

// Dia de consulta: daqui a 7 dias (o banco de teste abre todos os dias, 19 horários).
const pickDays = [
  'const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);',
  'pm.collectionVariables.set("day", day(7)); pm.collectionVariables.set("day3", day(9)); pm.collectionVariables.set("day32", day(38));',
];
const catalog = [
  ["Serviços", "GET", "/services", {
    status: 200,
    tests: [
      'const all = json.categories.flatMap((c) => c.services);',
      'pm.test("9 serviços ativos em categorias", () => { pm.expect(all).to.have.length(9); pm.expect(json.categories.map((c) => c.name)).to.eql(["Heitor", "Barbearia"]); });',
      'pm.test("formato do serviço", () => pm.expect(all.find((s) => s.id === "corte-heitor")).to.eql({ id: "corte-heitor", name: "Corte com Heitor", durationMinutes: 45, priceCents: 7000, professional: "Heitor" }));',
      'pm.test("sem profissional fixo vem null", () => pm.expect(all.find((s) => s.id === "corte-esfoliacao").professional).to.eql(null));',
    ],
  }],
  ["Horários de um dia", "GET", "/availability?serviceId=corte-heitor&from={{day}}&to={{day}}", {
    pre: pickDays,
    status: 200,
    tests: [
      'pm.test("19 horários no dia", () => { pm.expect(json.serviceId).to.eql("corte-heitor"); pm.expect(json.days).to.have.length(1); pm.expect(json.days[0].date).to.eql(pm.collectionVariables.get("day")); pm.expect(json.days[0].times).to.have.length(19); pm.expect(json.days[0].times[0]).to.eql("09:00"); });',
    ],
  }],
  ["Horários de três dias", "GET", "/availability?serviceId=corte-esfoliacao&from={{day}}&to={{day3}}", {
    status: 200,
    tests: ['pm.test("um item por dia", () => pm.expect(json.days.map((d) => d.date)).to.have.length(3));'],
  }],
  ["Horários sem serviceId", "GET", "/availability?from={{day}}&to={{day}}", { status: 400, tests: [isError("validation"), 'pm.test("aponta o campo", () => pm.expect(json.error.fields.serviceId).to.be.a("string"));'] }],
  ["Horários de serviço inexistente", "GET", "/availability?serviceId=nao-existe&from={{day}}&to={{day}}", { status: 404, tests: [isError("not_found")] }],
  ["Horários com data impossível", "GET", "/availability?serviceId=corte-heitor&from=2026-02-31&to=2026-03-01", { status: 400, tests: [isError("validation"), 'pm.test("aponta o campo", () => pm.expect(json.error.fields.from).to.be.a("string"));'] }],
  ["Horários com 32 dias", "GET", "/availability?serviceId=corte-heitor&from={{day}}&to={{day32}}", { status: 400, tests: [isError("validation"), 'pm.test("aponta o campo", () => pm.expect(json.error.fields.to).to.be.a("string"));'] }],
  ["Horários com from depois de to", "GET", "/availability?serviceId=corte-heitor&from={{day3}}&to={{day}}", { status: 400, tests: [isError("validation")] }],
  ["Remarcar sem login", "GET", "/availability?serviceId=corte-heitor&from={{day}}&to={{day}}&rescheduleOf=qualquer", { status: 401, tests: [isError("unauthenticated")] }],
  ["Remarcar reserva que não é do cliente", "GET", "/availability?serviceId=corte-heitor&from={{day}}&to={{day}}&rescheduleOf=nao-existe", { auth: "clientToken", status: 404, tests: [isError("not_found")] }],
];

// Reservas no dia {{day}} (daqui a 7 dias), com Heitor (profissional fixo).
const item = (time, serviceId = "corte-heitor") => ({ serviceId, date: "{{day}}", time });
const ELEVEN = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"].map((t) => item(t));
const listHas = (present) =>
  `pm.test("${present ? "contém" : "não contém"} a reserva", () => pm.expect(json.reservations.map((r) => r.id)).to.${present ? "" : "not."}include(pm.collectionVariables.get("reservationId")));`;
const reservations = [
  ["Marcar um horário", "POST", "/reservations", {
    auth: "clientToken", body: { items: [item("10:00")], note: "  Primeira vez  " }, status: 201,
    tests: [
      'const r = json.reservations[0];',
      'pm.test("uma reserva no formato público", () => { pm.expect(json.reservations).to.have.length(1); pm.expect(r).to.include({ date: pm.collectionVariables.get("day"), time: "10:00", endTime: "10:45", status: "agendado", note: "Primeira vez" }); pm.expect(r.service).to.eql({ id: "corte-heitor", name: "Corte com Heitor", durationMinutes: 45, priceCents: 7000, professional: "Heitor" }); pm.expect(r).to.not.have.property("userId"); });',
      'pm.collectionVariables.set("reservationId", r.id);',
    ],
  }],
  ["Listar as próximas", "GET", "/reservations", { auth: "clientToken", status: 200, tests: [listHas(true)] }],
  ["Listar as passadas", "GET", "/reservations?scope=past", { auth: "clientToken", status: 200, tests: ['pm.test("nenhuma passada", () => pm.expect(json.reservations).to.eql([]));'] }],
  ["Listar com scope inválido", "GET", "/reservations?scope=todas", { auth: "clientToken", status: 400, tests: [isError("validation")] }],
  ["Marcar o mesmo horário de novo", "POST", "/reservations", { auth: "clientToken", body: { items: [item("10:00")] }, status: 409, tests: [isError("slot_unavailable")] }],
  ["Outro cliente no mesmo horário do mesmo profissional", "POST", "/reservations", { auth: "client2Token", body: { items: [item("10:00")] }, status: 409, tests: [isError("slot_unavailable")] }],
  ["Marcar sem itens", "POST", "/reservations", { auth: "clientToken", body: { items: [] }, status: 400, tests: [isError("validation"), 'pm.test("aponta o campo", () => pm.expect(json.error.fields.items).to.be.a("string"));'] }],
  ["Marcar com item repetido", "POST", "/reservations", { auth: "clientToken", body: { items: [item("15:00"), item("15:00")] }, status: 400, tests: [isError("validation")] }],
  ["Marcar 11 itens", "POST", "/reservations", { auth: "clientToken", body: { items: ELEVEN }, status: 400, tests: [isError("validation")] }],
  ["Marcar sem corpo de lista", "POST", "/reservations", { auth: "clientToken", body: { items: "10:00" }, status: 400, tests: [isError("validation")] }],
  ["Nada gravado nos pedidos recusados", "GET", "/reservations", { auth: "clientToken", status: 200, tests: ['pm.test("só a primeira", () => pm.expect(json.reservations).to.have.length(1));'] }],
  ["Remarcar", "PATCH", "/reservations/{{reservationId}}", {
    auth: "clientToken", body: { date: "{{day}}", time: "16:00" }, status: 200,
    tests: ['pm.test("nova hora", () => { pm.expect(json.reservation.id).to.eql(pm.collectionVariables.get("reservationId")); pm.expect(json.reservation.time).to.eql("16:00"); pm.expect(json.reservation.endTime).to.eql("16:45"); });'],
  }],
  ["Lista mostra a hora nova", "GET", "/reservations", { auth: "clientToken", status: 200, tests: ['pm.test("hora nova na lista", () => pm.expect(json.reservations[0].time).to.eql("16:00"));'] }],
  ["Horário antigo ficou livre", "POST", "/reservations", { auth: "client2Token", body: { items: [item("10:00")] }, status: 201, tests: ['pm.collectionVariables.set("reservation2Id", json.reservations[0].id);'] }],
  ["Remarcar sem data", "PATCH", "/reservations/{{reservationId}}", { auth: "clientToken", body: { time: "17:00" }, status: 400, tests: [isError("validation"), 'pm.test("aponta o campo", () => pm.expect(json.error.fields.date).to.be.a("string"));'] }],
  ["Remarcar para horário ocupado", "PATCH", "/reservations/{{reservationId}}", { auth: "clientToken", body: { date: "{{day}}", time: "10:00" }, status: 409, tests: [isError("slot_unavailable")] }],
  ["Outro cliente remarcando", "PATCH", "/reservations/{{reservationId}}", { auth: "client2Token", body: { date: "{{day}}", time: "17:00" }, status: 404, tests: [isError("not_found")] }],
  ["Outro cliente cancelando", "POST", "/reservations/{{reservationId}}/cancel", { auth: "client2Token", status: 404, tests: [isError("not_found")] }],
  ["Remarcar reserva inexistente", "PATCH", "/reservations/nao-existe", { auth: "clientToken", body: { date: "{{day}}", time: "17:00" }, status: 404, tests: [isError("not_found")] }],
  ["Cancelar", "POST", "/reservations/{{reservationId}}/cancel", { auth: "clientToken", status: 204, tests: ['pm.test("sem corpo", () => pm.expect(pm.response.text()).to.eql(""));'] }],
  ["Cancelada some da lista", "GET", "/reservations", { auth: "clientToken", status: 200, tests: [listHas(false)] }],
  ["Cancelar de novo", "POST", "/reservations/{{reservationId}}/cancel", { auth: "clientToken", status: 404, tests: [isError("not_found")] }],
  ["Cancelar a do cliente 2", "POST", "/reservations/{{reservation2Id}}/cancel", { auth: "client2Token", status: 204 }],
  ["Listar sem token", "GET", "/reservations", { status: 401, tests: [isError("unauthenticated")] }],
  ["Marcar sem token", "POST", "/reservations", { body: { items: [item("10:00")] }, status: 401, tests: [isError("unauthenticated")] }],
  ["Listar com token de admin", "GET", "/reservations", { auth: "adminToken", status: 403, tests: [isError("forbidden")] }],
  ["Marcar com token de barbeiro", "POST", "/reservations", { auth: "barberToken", body: { items: [item("10:00", "corte-jimmy")] }, status: 403, tests: [isError("forbidden")] }],
  ["Listar com token de barbeiro", "GET", "/reservations", { auth: "barberToken", status: 403, tests: [isError("forbidden")] }],
  ["Marcar com token de admin", "POST", "/reservations", { auth: "adminToken", body: { items: [item("10:00")] }, status: 403, tests: [isError("forbidden")] }],
];

const messages = [
  ["Enviar mensagem", "POST", "/messages", {
    auth: "clientToken", body: { text: "  Oi, posso levar meu filho junto?  " }, status: 201,
    tests: [
      'pm.test("mensagem no formato público", () => { pm.expect(json.message).to.have.keys(["id", "from", "text", "createdAt"]); pm.expect(json.message.from).to.eql("cliente"); pm.expect(json.message.text).to.eql("Oi, posso levar meu filho junto?"); pm.expect(new Date(json.message.createdAt).toISOString()).to.eql(json.message.createdAt); });',
      'pm.collectionVariables.set("messageId", json.message.id);',
    ],
  }],
  ["Listar mensagens", "GET", "/messages", {
    auth: "clientToken", status: 200,
    tests: [
      'pm.test("contém a enviada, por último", () => { pm.expect(json.messages.at(-1).id).to.eql(pm.collectionVariables.get("messageId")); pm.expect(json.unread).to.be.a("number"); });',
      'pm.test("em ordem cronológica", () => { const t = json.messages.map((m) => m.createdAt); pm.expect(t).to.eql([...t].sort()); });',
      'pm.test("sem dados internos", () => pm.expect(json.messages[0]).to.not.have.property("customerId"));',
    ],
  }],
  ["Listar depois da última", "GET", "/messages?after={{messageId}}", { auth: "clientToken", status: 200, tests: ['pm.test("lista vazia", () => pm.expect(json.messages).to.eql([]));'] }],
  ["Listar depois de id desconhecido", "GET", "/messages?after=nao-existe", { auth: "clientToken", status: 200, tests: ['pm.test("lista completa", () => pm.expect(json.messages.map((m) => m.id)).to.include(pm.collectionVariables.get("messageId")));'] }],
  ["Outro cliente não vê", "GET", "/messages", { auth: "client2Token", status: 200, tests: ['pm.test("sem a mensagem do cliente 1", () => pm.expect(json.messages.map((m) => m.id)).to.not.include(pm.collectionVariables.get("messageId")));'] }],
  ["Enviar só espaços", "POST", "/messages", { auth: "clientToken", body: { text: "   " }, status: 400, tests: [isError("validation"), 'pm.test("aponta o campo", () => pm.expect(json.error.fields.text).to.be.a("string"));'] }],
  ["Enviar 2001 caracteres", "POST", "/messages", { auth: "clientToken", body: { text: "a".repeat(2001) }, status: 400, tests: [isError("validation")] }],
  ["Enviar 2000 caracteres", "POST", "/messages", { auth: "clientToken", body: { text: "a".repeat(2000) }, status: 201 }],
  ["Enviar texto de tipo errado", "POST", "/messages", { auth: "clientToken", body: { text: 42 }, status: 400, tests: [isError("validation")] }],
  ["Marcar como lidas", "POST", "/messages/read", { auth: "clientToken", status: 200, tests: ['pm.test("devolve quantas", () => pm.expect(json.marked).to.be.a("number"));'] }],
  ["Nada mais por ler", "GET", "/messages", { auth: "clientToken", status: 200, tests: ['pm.test("unread zero", () => pm.expect(json.unread).to.eql(0));'] }],
  ["Mensagens sem token", "GET", "/messages", { status: 401, tests: [isError("unauthenticated")] }],
  ["Mensagens com token de admin", "GET", "/messages", { auth: "adminToken", status: 403, tests: [isError("forbidden")] }],
  ["Mensagens com token de barbeiro", "GET", "/messages", { auth: "barberToken", status: 403, tests: [isError("forbidden")] }],
  ["Barbeiro não exclui a conta pela API", "DELETE", "/me", { auth: "barberToken", body: { password: "Teste#12345" }, status: 403, tests: [isError("forbidden")] }],
  ["Enviar com token de admin", "POST", "/messages", { auth: "adminToken", body: { text: "oi" }, status: 403, tests: [isError("forbidden")] }],
  ["Marcar lidas com token de admin", "POST", "/messages/read", { auth: "adminToken", status: 403, tests: [isError("forbidden")] }],
];

// Agenda do barbeiro (Heitor). O test:reset semeia "seed-heitor" e "seed-jimmy" ontem.
const noPrivate = 'pm.test("sem preço nem e-mail", () => { const raw = pm.response.text(); pm.expect(raw).to.not.include("priceCents"); pm.expect(raw).to.not.include("email"); });';
const agendaHas = (field, value) =>
  `pm.test("seed-heitor com ${field} = ${value}", () => pm.expect(json.reservations.find((r) => r.id === "seed-heitor").${field}).to.eql(${JSON.stringify(value)}));`;
const barber = [
  ["Agenda do barbeiro", "GET", "/barber/agenda?from={{past}}&to={{day}}", {
    auth: "barberToken", status: 200,
    pre: ['const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);', 'pm.collectionVariables.set("past", day(-2)); // dois dias: o "ontem" do estúdio (São Paulo) pode ser anteontem em UTC'],
    tests: [
      'pm.test("é do Heitor", () => pm.expect(json.professional).to.eql("Heitor"));',
      'const ids = json.reservations.map((r) => r.id);',
      'pm.test("só as dele", () => { pm.expect(ids).to.include("seed-heitor"); pm.expect(ids).to.not.include("seed-jimmy"); pm.expect(json.reservations.every((r) => r.service.id.includes("heitor") || r.service.id === "barba-pigmentacao" || r.service.id === "corte-esfoliacao")).to.be.true; });',
      'pm.test("formato", () => { const r = json.reservations.find((r) => r.id === "seed-heitor"); pm.expect(r).to.include({ time: "10:00", endTime: "10:45", status: "realizado", attendance: null, note: "Semente da coleção" }); pm.expect(r.service).to.eql({ id: "corte-heitor", name: "Corte com Heitor", durationMinutes: 45 }); pm.expect(r.customer).to.eql({ name: "Cliente Três", phone: "51900000006" }); });',
      noPrivate,
    ],
  }],
  ["Agenda com from depois de to", "GET", "/barber/agenda?from={{day}}&to={{past}}", { auth: "barberToken", status: 400, tests: [isError("validation")] }],
  ["Agenda com 32 dias", "GET", "/barber/agenda?from={{day}}&to={{day32}}", { auth: "barberToken", status: 400, tests: [isError("validation")] }],
  ["Agenda sem datas", "GET", "/barber/agenda", { auth: "barberToken", status: 400, tests: [isError("validation")] }],
  ["Agenda com token de cliente", "GET", "/barber/agenda?from={{past}}&to={{day}}", { auth: "clientToken", status: 403, tests: [isError("forbidden")] }],
  ["Agenda com admin sem profissional", "GET", "/barber/agenda?from={{past}}&to={{day}}", { auth: "adminToken", status: 403, tests: [isError("forbidden")] }],
  ["Agenda sem token", "GET", "/barber/agenda?from={{past}}&to={{day}}", { status: 401, tests: [isError("unauthenticated")] }],
  ["Marcar falta", "PUT", "/barber/reservations/seed-heitor/attendance", { auth: "barberToken", body: { attendance: "faltou" }, status: 204 }],
  ["Agenda mostra a falta", "GET", "/barber/agenda?from={{past}}&to={{day}}", { auth: "barberToken", status: 200, tests: [agendaHas("attendance", "faltou"), agendaHas("status", "faltou")] }],
  ["Desfazer", "PUT", "/barber/reservations/seed-heitor/attendance", { auth: "barberToken", body: { attendance: null }, status: 204 }],
  ["Agenda sem marcação", "GET", "/barber/agenda?from={{past}}&to={{day}}", { auth: "barberToken", status: 200, tests: [agendaHas("attendance", null), agendaHas("status", "realizado")] }],
  ["Marcar na reserva do colega", "PUT", "/barber/reservations/seed-jimmy/attendance", { auth: "barberToken", body: { attendance: "faltou" }, status: 404, tests: [isError("not_found")] }],
  ["Marcar com valor inválido", "PUT", "/barber/reservations/seed-heitor/attendance", { auth: "barberToken", body: { attendance: "talvez" }, status: 400, tests: [isError("validation")] }],
  ["Marcar sem o campo", "PUT", "/barber/reservations/seed-heitor/attendance", { auth: "barberToken", body: {}, status: 400, tests: [isError("validation")] }],
  ["Marcar com token de cliente", "PUT", "/barber/reservations/seed-heitor/attendance", { auth: "clientToken", body: { attendance: "faltou" }, status: 403, tests: [isError("forbidden")] }],
];

export const folders = [
  ["Studio", studio],
  ["Auth", auth],
  ["Account", account],
  ["Catalog", catalog],
  ["Reservations", reservations],
  ["Messages", messages],
  ["Barber", barber],
];
