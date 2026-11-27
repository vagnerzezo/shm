"use client";

import { Drawer } from "@base-ui/react/drawer";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/_lib/actions";
import { initials } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, GridIcon, LogOutIcon } from "../icons";
import { isStaffActive, type StaffLink } from "./nav";
import { StaffIcon } from "./staff-icon";

type Badges = Record<string, number>;

const tabClass = (active: boolean) =>
  cn(
    "flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
    active ? "text-[#121212]" : "text-[#6b6b69]",
  );
const pillClass = (active: boolean) => cn("relative grid h-8 w-14 place-items-center rounded-full", active && "bg-black/8");

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} não ${n === 1 ? "lida" : "lidas"}`}
      className="absolute -top-0.5 right-2 h-[18px] min-w-[18px] rounded-full bg-[#dc2626] px-[5px] text-center text-[10px] leading-[18px] font-bold text-white ring-2 ring-white"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Folha "Mais": quem está logado, Meus dados, os outros atalhos e Sair. */
function MoreSheet({
  links,
  user,
  profileHref,
  badges,
  active,
}: {
  links: StaffLink[];
  user: { name: string; email: string; roleLabel: string };
  profileHref: string;
  badges: Badges;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = links.reduce((sum, l) => sum + (badges[l.href] ?? 0), 0);
  const close = () => setOpen(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="down">
      <Drawer.Trigger className={tabClass(active || open)}>
        <span className={pillClass(active || open)}>
          <GridIcon className="size-[22px]" />
          <Count n={count} />
        </span>
        Mais
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black opacity-[calc(0.4*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className="w-full rounded-t-[28px] bg-white px-3 pt-2 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.16)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]">
            <div aria-hidden="true" className="mx-auto mb-3.5 h-[5px] w-10 rounded-full bg-black/15" />
            <Drawer.Content>
              <Drawer.Title className="sr-only">Menu</Drawer.Title>
              <div className="flex items-center gap-3 px-3 pt-1 pb-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#121212] text-[15px] font-bold text-white">
                  {initials(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{user.name}</p>
                  <p className="truncate text-[13px] text-[#5c5c5a]">
                    {user.email} · {user.roleLabel}
                  </p>
                </div>
                <Link
                  href={profileHref}
                  onClick={close}
                  className="flex h-9 shrink-0 items-center rounded-full border border-[#d6d3d1] px-3.5 text-[13px] font-semibold"
                >
                  Meus dados
                </Link>
              </div>

              <nav aria-label="Mais telas" className="grid grid-cols-2 gap-2 px-1">
                {links.map((l, i) => {
                  const wide = i === links.length - 1 && links.length % 2 === 1;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={close}
                      className={cn(
                        "relative flex rounded-[18px] bg-[#f5f5f4] p-3.5 text-[15px] font-semibold transition active:bg-[#e7e5e4]",
                        wide ? "col-span-2 h-[60px] items-center gap-3 py-0" : "h-[88px] flex-col justify-between",
                      )}
                    >
                      <StaffIcon name={l.icon} className="size-[22px]" />
                      <span className={cn(wide && "flex-1")}>{l.label}</span>
                      {wide && <ChevronRightIcon className="size-[18px] text-[#a8a29e]" />}
                      {(badges[l.href] ?? 0) > 0 && (
                        <span className="absolute top-3 right-3 rounded-full bg-[#dc2626] px-1.5 text-[11px] font-bold text-white">
                          {badges[l.href]}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <form action={signOut} className="mx-1 mt-3">
                <button
                  type="submit"
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-[#b91c1c] transition hover:bg-red-50"
                >
                  <LogOutIcon className="size-5" />
                  Sair
                </button>
              </form>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Celular: menu fixo embaixo. Admin: 4 atalhos + "Mais"; barbeiro: os itens dele. */
export function StaffTabBar({
  tabs,
  more,
  badges,
  user,
  profileHref,
}: {
  tabs: StaffLink[];
  more: StaffLink[];
  badges: Badges;
  user: { name: string; email: string; roleLabel: string };
  profileHref: string;
}) {
  const pathname = usePathname();
  const moreActive = more.some((l) => isStaffActive(l.href, pathname)) || pathname === profileHref;

  return (
    <>
      <div aria-hidden="true" className="h-[calc(65px+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />
      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/8 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {tabs.map((l) => {
          const active = isStaffActive(l.href, pathname);
          return (
            <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              <span className={pillClass(active)}>
                <StaffIcon name={l.icon} className="size-[22px]" />
                {!active && <Count n={badges[l.href] ?? 0} />}
              </span>
              <span className="max-w-full truncate">{l.label}</span>
            </Link>
          );
        })}
        {more.length > 0 && (
          <MoreSheet links={more} user={user} profileHref={profileHref} badges={badges} active={moreActive} />
        )}
      </nav>
    </>
  );
}
