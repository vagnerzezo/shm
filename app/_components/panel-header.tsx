"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserIcon } from "./icons";
import { NotificationBell, usePanel } from "./notification-bell";

const iconButton =
  "grid size-11 place-items-center rounded-full border border-black/15 bg-white text-black transition hover:bg-black/5";

export function PanelHeader({
  children,
  profileHref: forcedProfileHref,
}: {
  children?: ReactNode;
  /** Quando o caminho não diz de quem é a tela (ex.: /barbeiro aberto por um admin). */
  profileHref?: string;
}) {
  const pathname = usePathname();
  const panel = usePanel();
  // A moldura sabe quem está logado (barbeiro também usa telas /admin, mas o perfil dele é /conta).
  const profileHref =
    forcedProfileHref ?? panel?.profileHref ?? (pathname.startsWith("/admin") ? "/admin/perfil" : "/conta");

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {children}
      </div>
      <div className="flex shrink-0 gap-3">
        <NotificationBell />
        {/* No mobile o ícone fica na barra de cima, ao lado do menu. */}
        <Link href={profileHref} aria-label="Meus dados" className={`${iconButton} max-lg:hidden`}>
          <UserIcon className="size-4" />
        </Link>
      </div>
    </header>
  );
}
