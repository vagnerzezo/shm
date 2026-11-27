// Menu do painel (admin e barbeiro): o que vai na tab bar do celular, na folha
// "Mais" e nos grupos da sidebar do computador. Puro (sem React), para testar.

/** `icon` é o nome do componente em `app/_components/icons.tsx`. */
export type StaffLink = { href: string; label: string; icon: StaffIcon };
export type StaffIcon =
  | "HomeIcon"
  | "CalendarIcon"
  | "CalendarCheckIcon"
  | "UsersIcon"
  | "ListIcon"
  | "ChatIcon"
  | "MegaphoneIcon"
  | "ScissorsIcon"
  | "SettingsIcon"
  | "UserIcon";

const L = {
  inicio: { href: "/admin", label: "Início", icon: "HomeIcon" },
  agenda: { href: "/admin/agenda", label: "Agenda", icon: "CalendarIcon" },
  minhaAgenda: { href: "/barbeiro", label: "Minha agenda", icon: "CalendarCheckIcon" },
  clientes: { href: "/admin/clientes", label: "Clientes", icon: "UsersIcon" },
  historico: { href: "/admin/historico", label: "Histórico", icon: "ListIcon" },
  chat: { href: "/admin/chat", label: "Chat", icon: "ChatIcon" },
  marketing: { href: "/admin/marketing", label: "Marketing", icon: "MegaphoneIcon" },
  servicos: { href: "/admin/servicos", label: "Serviços", icon: "ScissorsIcon" },
  configuracoes: { href: "/admin/configuracoes", label: "Configurações", icon: "SettingsIcon" },
  meusDados: { href: "/conta", label: "Meus dados", icon: "UserIcon" },
} satisfies Record<string, StaffLink>;

export type StaffMenu = {
  tabs: StaffLink[];
  more: StaffLink[];
  groups: { title: string | null; links: StaffLink[] }[];
};

export function staffMenu(
  area: "admin" | "barbeiro",
  { myAgenda, accountOnly }: { myAgenda: boolean; accountOnly: boolean },
): StaffMenu {
  if (area === "barbeiro") {
    // Barbeiro ainda sem profissional: só Meus dados (as outras telas voltam para lá).
    const links = accountOnly
      ? [L.meusDados]
      : [{ ...L.agenda, label: "Minha agenda" }, L.clientes, L.historico, L.chat, L.meusDados];
    return { tabs: links, more: [], groups: [{ title: null, links }] };
  }

  const mine = myAgenda ? [L.minhaAgenda] : [];
  return {
    tabs: [L.inicio, L.agenda, L.clientes, L.chat],
    more: [...mine, L.historico, L.marketing, L.servicos, L.configuracoes],
    groups: [
      { title: "Operação", links: [L.inicio, L.agenda, ...mine, L.clientes, L.historico, L.chat] },
      { title: "Gestão", links: [L.marketing, L.servicos, L.configuracoes] },
    ],
  };
}

/** Início de cada área só fica ativo na própria página; o resto, também nas subpáginas. */
export function isStaffActive(href: string, pathname: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
