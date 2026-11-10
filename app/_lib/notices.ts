// Avisos mostrados depois de um redirecionamento: a ação do servidor manda
// para `?aviso=<chave>` e a tela mostra o texto como toast.

export const notices = {
  "template-salvo": "Template salvo.",
  "regra-salva": "Regra salva.",
  "reserva-criada": "Reserva criada.",
  "reserva-remarcada": "Reserva remarcada.",
  "reserva-cancelada": "Reserva cancelada.",
  "cliente-criado": "Cliente cadastrado.",
  "cliente-excluido": "Dados do cliente excluídos.",
  "servico-salvo": "Serviço salvo.",
  "senha-redefinida": "Senha alterada. Você já está conectado.",
  "conta-excluida": "Sua conta e seus dados foram excluídos.",
} as const;

export type NoticeKey = keyof typeof notices;

/** Acrescenta `aviso=<chave>` a um caminho que pode já ter parâmetros. */
export function withNotice(path: string, key: NoticeKey) {
  return `${path}${path.includes("?") ? "&" : "?"}aviso=${key}`;
}
