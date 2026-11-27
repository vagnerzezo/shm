"use client";

import type { ReactNode } from "react";
import { NotificationBell } from "./notification-bell";

/**
 * Título da página do painel, com as ações à direita e, no computador, o sino.
 * No celular o sino fica na barra de cima (ver `staff/top-bar.tsx`).
 */
export function PanelHeader({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        {actions}
        <span className="max-lg:hidden">
          <NotificationBell />
        </span>
      </div>
    </header>
  );
}
