"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/marketing", label: "Visão geral" },
  { href: "/admin/marketing/templates", label: "Templates" },
  { href: "/admin/marketing/emails", label: "E-mails" },
  { href: "/admin/marketing/mensagens", label: "Mensagens" },
  { href: "/admin/marketing/historico", label: "Histórico" },
];

export function MarketingTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções de marketing" className="mt-6 overflow-x-auto [scrollbar-width:none]">
      <div className="flex w-max gap-1 rounded-xl border border-black/15 bg-white/70 p-1">
        {tabs.map(({ href, label }) => {
          const active = href === "/admin/marketing" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition",
                active ? "bg-[#121212] text-white" : "text-black hover:bg-black/5",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
