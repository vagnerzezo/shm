"use client";

import { Drawer } from "@base-ui/react/drawer";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/_lib/actions";
import { cn } from "@/lib/utils";
import { LogOutIcon, MenuIcon, XIcon } from "./icons";
import { isActiveLink, navByArea, type Area } from "./nav";

type NavLink = (typeof navByArea)[Area][number];
/** Números ao lado dos itens do menu (ex.: mensagens não lidas), por `href`. */
type Badges = Record<string, number>;

function NavLinks({
  links,
  className,
  itemClassName,
  onNavigate,
  badges,
}: {
  links: readonly NavLink[];
  className: string;
  itemClassName: string;
  onNavigate?: () => void;
  badges: Badges;
}) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {links.map(({ href, label, Icon }) => {
        const active = isActiveLink(href, pathname);
        const count = badges[href] ?? 0;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl border border-black font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${itemClassName} ${
              active
                ? "bg-[#121212] text-white"
                : "bg-white text-black hover:bg-black hover:text-white"
            }`}
          >
            <Icon className="size-5" />
            {label}
            {count > 0 && (
              <span
                aria-label={`${count} não ${count === 1 ? "lida" : "lidas"}`}
                className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${
                  active ? "bg-white text-black" : "bg-red-600 text-white"
                }`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Address({ lines, className }: { lines: string[]; className: string }) {
  if (lines.length === 0) return null;
  return (
    <address className={`text-sm font-semibold not-italic leading-relaxed text-black ${className}`}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </address>
  );
}

function LogoutButton({ onClick, className }: { onClick?: () => void; className: string }) {
  return (
    <form action={signOut} className="w-full">
      <button
        type="submit"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-xl border border-black bg-white font-semibold text-black transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${className}`}
      >
        <LogOutIcon className="size-5" />
        Sair
      </button>
    </form>
  );
}

// Só no mobile: o menu abre numa gaveta lateral que fecha ao arrastar para a direita.
function MobileMenu({
  links,
  address,
  badges,
}: {
  links: readonly NavLink[];
  address: string[];
  badges: Badges;
}) {
  const unread = Object.values(badges).reduce((a, b) => a + b, 0);
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="right">
      <Drawer.Trigger
        aria-label="Abrir menu"
        className="grid size-11 place-items-center rounded-xl border border-black bg-white text-black transition hover:bg-black hover:text-white lg:hidden"
      >
        <span className="relative">
          <MenuIcon className="size-5" />
          {unread > 0 && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-red-600 ring-2 ring-white" />}
        </span>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black opacity-[calc(0.35*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
          {/* `--bleed` estende a gaveta para fora da tela, escondendo a borda no "elástico" do arraste. */}
          <Drawer.Popup className="[--bleed:3rem] -mr-(--bleed) flex h-full w-[calc(20rem+var(--bleed))] max-w-[calc(100vw-3rem+var(--bleed))] flex-col overflow-y-auto overscroll-contain border-l border-black/15 bg-white/85 py-6 pl-6 pr-[calc(1.5rem+var(--bleed))] outline-none backdrop-blur-xl [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-starting-style:[transform:translateX(calc(100%-var(--bleed)))] data-ending-style:[transform:translateX(calc(100%-var(--bleed)))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]">
            <Drawer.Content className="flex flex-1 flex-col gap-6">
              <div className="flex items-center justify-between">
                <Drawer.Title className="text-lg font-bold text-black">Menu</Drawer.Title>
                <Drawer.Close
                  aria-label="Fechar menu"
                  className="grid size-11 place-items-center rounded-xl border border-black bg-white text-black transition hover:bg-black hover:text-white"
                >
                  <XIcon className="size-5" />
                </Drawer.Close>
              </div>

              <NavLinks
                links={links}
                onNavigate={() => setOpen(false)}
                badges={badges}
                className="grid gap-2"
                itemClassName="h-12 px-4 text-sm"
              />

              <LogoutButton onClick={() => setOpen(false)} className="h-12 px-4 text-sm" />

              <Address lines={address} className="mt-auto" />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function Sidebar({
  area,
  address,
  studioName,
  badges = {},
}: {
  area: Area;
  address: string[];
  studioName: string;
  badges?: Badges;
}) {
  const links = navByArea[area];
  // Com muitos itens (admin), botões mais baixos para o endereço continuar cabendo.
  const compact = links.length > 4;
  const size = compact ? "h-11 text-sm" : "h-14 text-base";

  return (
    <aside
      className={cn(
        "relative z-10 flex w-full shrink-0 items-center justify-between gap-x-4 rounded-2xl border border-black/15 bg-white/45 px-5 py-3 backdrop-blur-xl lg:w-[400px] lg:flex-col lg:px-9",
        // Telas baixas: o menu rola dentro do cartão em vez de vazar por baixo.
        "lg:overflow-y-auto lg:[scrollbar-width:thin]",
        compact ? "lg:gap-5 lg:py-8" : "lg:gap-6 lg:py-12",
      )}
    >
      <Link href={area === "admin" ? "/admin" : "/"} aria-label="Início" className="lg:contents">
        <Image
          src="/img/logo.png"
          alt={studioName}
          width={300}
          height={200}
          preload
          className={cn("h-auto w-28 lg:w-full", compact ? "lg:max-w-[240px]" : "lg:mt-4 lg:max-w-[340px]")}
        />
      </Link>

      <MobileMenu links={links} address={address} badges={badges} />

      <NavLinks
        links={links}
        badges={badges}
        className={`hidden w-full grid-cols-1 lg:grid ${compact ? "gap-2" : "gap-4"}`}
        itemClassName={`justify-center ${size}`}
      />

      <LogoutButton className={`hidden justify-center lg:flex ${size}`} />

      <Address lines={address} className="hidden text-center lg:block" />
    </aside>
  );
}
