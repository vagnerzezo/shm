"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon } from "../icons";
import { hidesTopBar } from "./tabs";

/** Celular: barra baixa com o logo e o atalho de Meus dados. */
export function ClientTopBar({ studioName }: { studioName: string }) {
  const pathname = usePathname();
  if (hidesTopBar(pathname)) return null;

  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-black/6 bg-[#f5f5f4]/95 pt-[env(safe-area-inset-top)] pr-2 pl-4 backdrop-blur-md lg:hidden">
      <Link href="/" aria-label="Início" className="flex h-14 items-center">
        <Image src="/img/logo.png" alt={studioName} width={300} height={200} preload className="h-auto w-[92px]" />
      </Link>
      <Link
        href="/conta"
        aria-label="Meus dados"
        aria-current={pathname === "/conta" ? "page" : undefined}
        className="grid size-11 place-items-center rounded-full transition hover:bg-black/5"
      >
        <UserIcon className="size-[22px]" />
      </Link>
    </header>
  );
}
