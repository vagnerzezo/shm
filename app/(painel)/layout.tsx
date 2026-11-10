import type { ReactNode } from "react";
import { PanelFrame } from "@/app/_components/panel-frame";

// Área do cliente: /agendamento, /reservas, /mensagens e /conta.
export default function PainelLayout({ children }: { children: ReactNode }) {
  return <PanelFrame area="cliente">{children}</PanelFrame>;
}
