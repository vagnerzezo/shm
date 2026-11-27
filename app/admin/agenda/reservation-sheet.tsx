"use client";

import { Drawer } from "@base-ui/react/drawer";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { XIcon } from "@/app/_components/icons";

/**
 * Celular: a reserva aberta na agenda aparece numa folha de baixo. Fechar
 * (X, fundo ou arrastar) volta para o dia. No computador não abre: os detalhes
 * ficam no painel ao lado.
 */
export function ReservationSheet({ closeHref, title, children }: { closeHref: string; title: string; children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.matchMedia("(max-width: 1023px)").matches);
  }, []);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.replace(closeHref, { scroll: false });
      }}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black opacity-[calc(0.4*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[400ms] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className="flex max-h-[calc(100dvh-72px)] w-full flex-col rounded-t-[28px] bg-white pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.16)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]">
            <div aria-hidden="true" className="mx-auto mt-2 h-[5px] w-10 shrink-0 rounded-full bg-black/15" />
            <div className="flex justify-end px-3 pt-1">
              <Drawer.Close aria-label="Fechar" className="grid size-11 place-items-center rounded-full bg-[#f5f5f4]">
                <XIcon className="size-5" />
              </Drawer.Close>
            </div>
            <Drawer.Content className="min-h-0 overflow-y-auto overscroll-contain">
              <Drawer.Title className="sr-only">{title}</Drawer.Title>
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
