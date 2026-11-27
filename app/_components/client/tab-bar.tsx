"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActiveLink, navByArea } from "../nav";
import { hidesTabs } from "./tabs";

/** Celular: menu fixo embaixo, na zona do polegar. Some nas telas com barra de ação própria. */
export function ClientTabBar({ unread }: { unread: number }) {
  const pathname = usePathname();
  // Sem tab bar, o fim da página ainda precisa sair de baixo da barra do iPhone.
  if (hidesTabs(pathname)) return <div aria-hidden="true" className="h-[env(safe-area-inset-bottom)] shrink-0 lg:hidden" />;

  return (
    <>
      {/* Reserva o espaço da barra no fim da página, para nada ficar escondido atrás dela. */}
      <div aria-hidden="true" className="h-[calc(65px+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />
      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/8 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {navByArea.cliente.map(({ href, label, Icon }) => {
          const active = isActiveLink(href, pathname);
          const count = href === "/mensagens" && !active ? unread : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                active ? "text-[#121212]" : "text-[#6b6b69]",
              )}
            >
              <span className={cn("relative grid h-8 w-14 place-items-center rounded-full", active && "bg-black/8")}>
                <Icon className="size-[22px]" />
                {count > 0 && (
                  <span
                    aria-label={`${count} não ${count === 1 ? "lida" : "lidas"}`}
                    className="absolute -top-0.5 right-2 h-[18px] min-w-[18px] rounded-full bg-[#dc2626] px-[5px] text-center text-[10px] leading-[18px] font-bold text-white ring-2 ring-white"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
