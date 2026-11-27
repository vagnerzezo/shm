// Telas do cliente que têm barra de ação fixa embaixo ("Continuar", "Confirmar
// reserva"): nelas a tab bar do celular sai para dar lugar à barra.
const ACTION_BAR = [/^\/agendamento\/horario/, /^\/agendamento\/confirmacao/, /^\/reservas\/[^/]+\/remarcar/];

export function hidesTabs(pathname: string) {
  return ACTION_BAR.some((re) => re.test(pathname));
}

// Telas com cabeçalho próprio no celular (passos do agendamento, conversa):
// nelas a barra de cima com o logo sai.
const OWN_HEADER = [/^\/agendamento/, /^\/reservas\/[^/]+\/remarcar/, /^\/mensagens/];

export function hidesTopBar(pathname: string) {
  return OWN_HEADER.some((re) => re.test(pathname));
}
