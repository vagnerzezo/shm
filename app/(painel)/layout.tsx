import type { ReactNode } from "react";
import { PanelFrame } from "@/app/_components/panel-frame";
import { getCurrentUser } from "@/app/_lib/auth";

// Área do cliente: /agendamento, /reservas, /mensagens e /conta. O barbeiro só
// chega a /conta ("Meus dados"); nela, vê o menu dele.
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return <PanelFrame area={user?.role === "barbeiro" ? "barbeiro" : "cliente"}>{children}</PanelFrame>;
}
