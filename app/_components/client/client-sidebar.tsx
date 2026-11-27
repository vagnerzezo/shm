"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/_lib/actions";
import { initials } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { LogOutIcon, PlusIcon } from "../icons";
import { isActiveLink, navByArea } from "../nav";
import { CountBadge } from "./ui";

/** Computador: menu à esquerda, 248 px. */
export function ClientSidebar({ unread, name, studioName }: { unread: number; name: string; studioName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[#e7e5e4] bg-white px-3.5 pt-6 pb-4 lg:flex">
      <Link href="/" aria-label="Início" className="block px-2.5 pt-1 pb-8">
        <Image src="/img/logo.png" alt={studioName} width={300} height={200} preload className="h-auto w-32" />
      </Link>

      <Link
        href="/agendamento"
        className="mx-0.5 mb-[18px] flex h-11 items-center justify-center gap-2 rounded-xl bg-[#121212] text-sm font-semibold text-white transition hover:bg-black/85"
      >
        <PlusIcon className="size-[18px]" />
        Novo agendamento
      </Link>

      <nav aria-label="Menu principal" className="flex flex-col gap-0.5">
        {navByArea.cliente.map(({ href, label, Icon }) => {
          const active = isActiveLink(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-[10px] px-2.5 text-sm font-semibold transition",
                active ? "bg-[#f0efee] text-[#121212]" : "text-[#3f3f3d] hover:bg-[#f5f5f4]",
              )}
            >
              <Icon className="size-5" />
              <span className="flex-1">{label}</span>
              {href === "/mensagens" && !active && <CountBadge count={unread} />}
            </Link>
          );
        })}
      </nav>

      {name ? (
        <div className="mt-auto flex items-center gap-2.5 border-t border-[#f0efee] pt-3">
          <Link
            href="/conta"
            aria-current={pathname === "/conta" ? "page" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-[#f5f5f4]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f0efee] text-[13px] font-bold">
              {initials(name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
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
      ) : (
        <Link
          href="/login"
          className="mt-auto flex h-11 items-center justify-center rounded-xl border border-[#e7e5e4] text-sm font-semibold transition hover:border-[#121212]"
        >
          Entrar
        </Link>
      )}
    </aside>
  );
}
