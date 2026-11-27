"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/_lib/actions";
import { initials } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { LogOutIcon } from "../icons";
import { isStaffActive, type StaffMenu } from "./nav";
import { StaffIcon } from "./staff-icon";

/** Computador: menu à esquerda, 248 px, em grupos. */
export function StaffSidebar({
  groups,
  badges,
  homeHref,
  profileHref,
  studioName,
  userName,
}: {
  groups: StaffMenu["groups"];
  badges: Record<string, number>;
  homeHref: string;
  profileHref: string;
  studioName: string;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[#e7e5e4] bg-white px-3.5 pt-6 pb-4 lg:flex">
      <Link href={homeHref} aria-label="Início" className="block px-2.5 pt-1 pb-7">
        <Image src="/img/logo.png" alt={studioName} width={300} height={200} preload className="h-auto w-32" />
      </Link>

      {groups.map((g, i) => (
        <div key={g.title ?? i} className={cn(i > 0 && "mt-[22px]")}>
          {g.title && <p className="mx-2.5 mb-1.5 text-[11px] font-semibold tracking-[0.8px] text-[#6b6b69] uppercase">{g.title}</p>}
          <nav aria-label={g.title ?? "Menu principal"} className="flex flex-col gap-0.5">
            {g.links.map((l) => {
              const active = isStaffActive(l.href, pathname);
              const count = badges[l.href] ?? 0;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-[10px] px-2.5 text-sm font-semibold transition",
                    active ? "bg-[#121212] text-white" : "text-[#3f3f3d] hover:bg-[#f5f5f4]",
                  )}
                >
                  <StaffIcon name={l.icon} className="size-5" />
                  <span className="flex-1">{l.label}</span>
                  {count > 0 && (
                    <span
                      aria-label={`${count} não ${count === 1 ? "lida" : "lidas"}`}
                      className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                        active ? "bg-white text-[#121212]" : "bg-[#dc2626] text-white",
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="mt-auto flex items-center gap-2.5 border-t border-[#f0efee] pt-3">
        <Link
          href={profileHref}
          aria-current={pathname === profileHref ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-[#f5f5f4]"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#121212] text-[13px] font-bold text-white">
            {initials(userName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{userName}</span>
            <span className="block text-xs text-[#5c5c5a]">Meus dados</span>
          </span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sair"
            title="Sair"
            className="grid size-10 place-items-center rounded-[10px] text-[#5c5c5a] transition hover:bg-[#f5f5f4] hover:text-[#121212]"
          >
            <LogOutIcon className="size-5" />
          </button>
        </form>
      </div>
    </aside>
  );
}
