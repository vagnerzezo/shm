import { CalendarCheckIcon, CalendarIcon, ChatIcon, HomeIcon } from "./icons";

// Menu da área do cliente (tab bar e sidebar dele). O do painel (admin e
// barbeiro) fica em `staff/nav.ts`.
export const navByArea = {
  cliente: [
    { href: "/", label: "Início", Icon: HomeIcon },
    { href: "/agendamento", label: "Agendar", Icon: CalendarIcon },
    { href: "/reservas", label: "Reservas", Icon: CalendarCheckIcon },
    { href: "/mensagens", label: "Mensagens", Icon: ChatIcon },
  ],
};

/** Quem está vendo a moldura do painel. */
export type Area = "cliente" | "barbeiro" | "admin";

/** Início só fica ativo na própria página; o resto, também nas subpáginas. */
export function isActiveLink(href: string, pathname: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}
