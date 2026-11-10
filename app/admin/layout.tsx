import type { ReactNode } from "react";
import { PanelFrame } from "@/app/_components/panel-frame";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <PanelFrame area="admin">{children}</PanelFrame>;
}
