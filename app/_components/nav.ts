import {
  CalendarCheckIcon,
  CalendarIcon,
  ChatIcon,
  HomeIcon,
  ListIcon,
  MegaphoneIcon,
  ScissorsIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

// Menu de cada perfil, usado pela sidebar e pela tela inicial.
// Telas novas do admin entram em `admin` e aparecem nos dois lugares.
export const navByArea = {
  cliente: [
    { href: "/", label: "Início", Icon: HomeIcon },
    { href: "/agendamento", label: "Agendar", Icon: CalendarIcon },
    { href: "/reservas", label: "Reservas", Icon: CalendarCheckIcon },
    { href: "/mensagens", label: "Mensagens", Icon: ChatIcon },
  ],
  // Barbeiro: as telas do painel, sempre só com os dados dele.
  barbeiro: [
    { href: "/admin/agenda", label: "Minha agenda", Icon: CalendarIcon },
    { href: "/admin/clientes", label: "Clientes", Icon: UsersIcon },
    { href: "/admin/historico", label: "Histórico", Icon: ListIcon },
    { href: "/admin/chat", label: "Chat", Icon: ChatIcon },
    { href: "/conta", label: "Meus dados", Icon: UserIcon },
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
export type NavItem = (typeof navByArea)[Area][number];

/** Entra no menu do admin quando a conta dele está ligada a um profissional ("Sou eu"). */
export const myAgendaLink = { href: "/barbeiro", label: "Minha agenda", Icon: CalendarCheckIcon };

/** Início de cada área só fica ativo na própria página; o resto, também nas subpáginas. */
export function isActiveLink(href: string, pathname: string) {
  return href === "/" || href === "/admin" ? pathname === href : pathname.startsWith(href);
}
