import type { ReactNode } from "react";
import { ClientFrame } from "@/app/_components/client/client-frame";
import { PanelFrame } from "@/app/_components/panel-frame";
import { getCurrentUser } from "@/app/_lib/auth";

// Área do cliente: /agendamento, /reservas, /mensagens e /conta. O barbeiro só
// chega a /conta ("Meus dados"); nela, continua com a moldura e o menu dele.
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role === "barbeiro") return <PanelFrame area="barbeiro">{children}</PanelFrame>;
  return <ClientFrame>{children}</ClientFrame>;
}
