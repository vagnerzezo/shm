import type { Metadata } from "next";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle } from "@/app/_components/ui";
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
        <PageTitle title="Marketing" description="E-mails e mensagens automáticos para quem está há um tempo sem agendar." />
      </PanelHeader>
      <MarketingTabs />
      <div className="mt-4 flex-1 lg:mt-5">{children}</div>
    </>
  );
}
