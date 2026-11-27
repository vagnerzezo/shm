"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/marketing", label: "Visão geral" },
  { href: "/admin/marketing/templates", label: "Templates" },
  { href: "/admin/marketing/emails", label: "E-mails" },
  { href: "/admin/marketing/mensagens", label: "Mensagens" },
  { href: "/admin/marketing/historico", label: "Histórico" },
];

/** Celular: pílulas que rolam para o lado. Computador: abas sublinhadas. */
export function MarketingTabs() {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  // Celular: a aba aberta aparece mesmo se estiver no fim da fila.
  useEffect(() => {
    const el = nav.current;
    const active = el?.querySelector<HTMLElement>("[aria-current=page]");
    if (el && active) el.scrollLeft = active.offsetLeft - el.offsetLeft - 16;
  }, [pathname]);
  return (
    <div className="relative -mx-4 mt-4 lg:mx-0">
      <nav
        ref={nav}
        aria-label="Seções de marketing"
        className="flex gap-2 overflow-x-auto pr-12 pl-4 [scrollbar-width:none] lg:gap-7 lg:overflow-visible lg:border-b lg:border-[#e7e5e4] lg:px-0"
      >
        {tabs.map(({ href, label }) => {
          const active = href === "/admin/marketing" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[38px] shrink-0 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition",
                "lg:h-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:pt-2.5 lg:pb-3",
                active
                  ? "border-[#121212] bg-[#121212] text-white lg:font-bold lg:text-[#121212] lg:shadow-[inset_0_-2px_0_#121212]"
                  : "border-[#e7e5e4] bg-white text-[#121212] lg:text-[#5c5c5a] lg:hover:text-[#121212]",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {/* Celular: avisa que há mais abas à direita. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-[#f5f5f4]/0 to-[#f5f5f4] lg:hidden"
      />
    </div>
  );
}
