import { Suspense, type ReactNode } from "react";
import { scopeOf } from "@/app/_lib/access";
import { getCurrentUser } from "@/app/_lib/auth";
import { getUnreadCount } from "@/app/_lib/chat";
import { getBell } from "@/app/_lib/notifications";
import { readDb } from "@/app/_lib/db";
import { studioOf } from "@/app/_lib/studio";
import { AutoRefresh } from "./auto-refresh";
import { FlashToast } from "./flash-toast";
import { InstallBanner } from "./install-banner";
import type { Area } from "./nav";
import { PanelProvider } from "./notification-bell";
import { staffMenu } from "./staff/nav";
import { StaffSidebar } from "./staff/sidebar";
import { StaffTabBar } from "./staff/tab-bar";
import { StaffTopBar } from "./staff/top-bar";
import { Toaster } from "./toaster";

/**
 * Moldura do painel (admin e barbeiro): barra de cima e tab bar no celular,
 * sidebar de 248 px no computador. O cliente usa `client/client-frame.tsx`.
 */
export async function PanelFrame({ area: requested, children }: { area: Area; children: ReactNode }) {
  // Uma leitura do banco por tela: estúdio, contadores e sino usam a mesma.
  const db = await readDb();
  const studio = studioOf(db);
  const user = await getCurrentUser();
  // Barbeiro abre telas de /admin (filtradas para ele), mas com o menu dele.
  const area = requested === "admin" && user?.role !== "barbeiro" ? "admin" : "barbeiro";
  const staff = user && (user.role === "admin" || (user.role === "barbeiro" && user.professional));
  const bell = staff ? await getBell(user, db) : null;
  const profileHref = user?.role === "admin" ? "/admin/perfil" : "/conta";
  const accountOnly = area === "barbeiro" && user?.role === "barbeiro" && !user.professional;
  const homeHref = accountOnly ? "/conta" : area === "admin" ? "/admin" : "/admin/agenda";
  const badges: Record<string, number> = staff ? { "/admin/chat": await getUnreadCount(scopeOf(user), db) } : {};
  const menu = staffMenu(area, { myAgenda: user?.role === "admin" && Boolean(user.professional), accountOnly });
  const who = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    roleLabel: user?.role === "admin" ? "Admin" : "Barbeiro",
  };

  return (
    <PanelProvider value={{ bell, profileHref }}>
      <div className="flex min-h-dvh w-full flex-col bg-[#f5f5f4] text-[#121212] [--toast-offset:calc(65px+env(safe-area-inset-bottom))] lg:h-dvh lg:flex-row lg:[--toast-offset:0px]">
        <StaffSidebar
          groups={menu.groups}
          badges={badges}
          homeHref={homeHref}
          profileHref={profileHref}
          studioName={studio.name}
          userName={who.name}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
          <StaffTopBar homeHref={homeHref} profileHref={profileHref} studioName={studio.name} />
          <main className="flex w-full flex-1 flex-col px-4 pt-5 pb-6 lg:min-h-0 lg:px-10 lg:py-8">
            {/* Convite para instalar o app (só no celular, se ainda não instalou). */}
            <InstallBanner />
            {children}
          </main>
          <StaffTabBar tabs={menu.tabs} more={menu.more} badges={badges} user={who} profileHref={profileHref} />
        </div>

        {/* Equipe: sino e contadores se atualizam a cada 30 s com a tela parada. */}
        {staff && <AutoRefresh intervalMs={30_000} />}
        <Toaster />
        <Suspense>
          <FlashToast />
        </Suspense>
      </div>
    </PanelProvider>
  );
}
