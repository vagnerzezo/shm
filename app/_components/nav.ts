import {
  CalendarCheckIcon,
  CalendarIcon,
  ChatIcon,
  HistoryIcon,
  HomeIcon,
  ListIcon,
  MegaphoneIcon,
  ScissorsIcon,
  SettingsIcon,
  UsersIcon,
} from "./icons";

// Menu de cada perfil, usado pela sidebar e pela tela inicial.
// Telas novas do admin entram em `admin` e aparecem nos dois lugares.
export const navByArea = {
  cliente: [
    { href: "/", label: "Início", Icon: HistoryIcon },
    { href: "/agendamento", label: "Agendar", Icon: CalendarIcon },
    { href: "/reservas", label: "Reservas", Icon: CalendarCheckIcon },
    { href: "/mensagens", label: "Mensagens", Icon: ChatIcon },
  ],
  admin: [
    { href: "/admin", label: "Início", Icon: HomeIcon },
    { href: "/admin/agenda", label: "Agenda", Icon: CalendarIcon },
    { href: "/admin/clientes", label: "Clientes", Icon: UsersIcon },
    { href: "/admin/historico", label: "Histórico", Icon: ListIcon },
    { href: "/admin/chat", label: "Chat", Icon: ChatIcon },
    { href: "/admin/marketing", label: "Marketing", Icon: MegaphoneIcon },
    { href: "/admin/servicos", label: "Serviços", Icon: ScissorsIcon },
    { href: "/admin/configuracoes", label: "Configurações", Icon: SettingsIcon },
  ],
};

export type Area = keyof typeof navByArea;

/** Início de cada área só fica ativo na própria página; o resto, também nas subpáginas. */
export function isActiveLink(href: string, pathname: string) {
  return href === "/" || href === "/admin" ? pathname === href : pathname.startsWith(href);
}
