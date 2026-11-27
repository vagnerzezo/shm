import Image from "next/image";
import Link from "next/link";
import { UserIcon } from "../icons";
import { NotificationBell } from "../notification-bell";

/** Celular: barra baixa com logo, sino e Meus dados. */
export function StaffTopBar({ homeHref, profileHref, studioName }: { homeHref: string; profileHref: string; studioName: string }) {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-black/6 bg-[#f5f5f4]/95 pt-[env(safe-area-inset-top)] pr-2 pl-4 backdrop-blur-md lg:hidden">
      <Link href={homeHref} aria-label="Início" className="flex h-14 items-center">
        <Image src="/img/logo.png" alt={studioName} width={300} height={200} preload className="h-auto w-[92px]" />
      </Link>
      <div className="flex items-center gap-0.5">
        <NotificationBell variant="bar" />
        <Link
          href={profileHref}
          aria-label="Meus dados"
          className="grid size-11 place-items-center rounded-full transition hover:bg-black/5"
        >
          <UserIcon className="size-[22px]" />
        </Link>
      </div>
    </header>
  );
}
