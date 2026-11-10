import type { Metadata } from "next";
import { PanelHeader } from "@/app/_components/panel-header";
import { requireAdmin } from "@/app/_lib/auth";
import { MarketingTabs } from "./tabs";

export const metadata: Metadata = {
  title: "Marketing | Studio Heitor Macks",
};

export default async function MarketingLayout({ children }: LayoutProps<"/admin/marketing">) {
  await requireAdmin("/admin/marketing");
  return (
    <>
      <PanelHeader>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">Marketing</h1>
        <p className="mt-1 text-sm text-black/70">
          E-mails e mensagens automáticos para quem está há um tempo sem agendar.
        </p>
      </PanelHeader>
      <MarketingTabs />
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">{children}</div>
    </>
  );
}
