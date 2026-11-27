import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/app/_lib/auth";
import { getCustomerUnreadCount } from "@/app/_lib/chat";
import { readDb } from "@/app/_lib/db";
import { studioOf } from "@/app/_lib/studio";
import { cn } from "@/lib/utils";
import { FlashToast } from "../flash-toast";
import { Toaster } from "../toaster";
import { ClientSidebar } from "./client-sidebar";
import { ClientInstallBanner, ClientTopBar } from "./client-top-bar";
import { ClientTabBar } from "./tab-bar";
import { displayFont } from "./ui";

/**
 * Moldura da área do cliente: barra de cima e tab bar no celular, sidebar de
 * 248 px no computador. Admin e barbeiro continuam com `PanelFrame`.
 */
export async function ClientFrame({ children }: { children: ReactNode }) {
  const db = await readDb();
  const studio = studioOf(db);
  const user = await getCurrentUser();
  const unread = user ? await getCustomerUnreadCount(user.id, db) : 0;

  return (
    <div
      className={cn(
        displayFont.variable,
        // Toasts sobem acima da tab bar no celular.
        "flex min-h-dvh w-full flex-col bg-[#f5f5f4] text-[#121212] [--toast-offset:calc(65px+env(safe-area-inset-bottom))] lg:h-dvh lg:flex-row lg:[--toast-offset:0px]",
      )}
    >
      <ClientSidebar unread={unread} name={user?.name ?? ""} studioName={studio.name} />

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
        <ClientTopBar studioName={studio.name} />
        <main className="mx-auto flex w-full max-w-[1192px] flex-1 flex-col px-4 pt-5 pb-6 lg:px-12 lg:py-10">
          {/* Convite para instalar o app (só no celular, se ainda não instalou). */}
          <ClientInstallBanner />
          {children}
        </main>
        <ClientTabBar unread={unread} />
      </div>

      <Toaster />
      <Suspense>
        <FlashToast />
      </Suspense>
    </div>
  );
}
