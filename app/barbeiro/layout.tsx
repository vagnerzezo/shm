import type { ReactNode } from "react";
import { PanelFrame } from "@/app/_components/panel-frame";
import { getCurrentUser } from "@/app/_lib/auth";

// Área do barbeiro: "Minha agenda". "Meus dados" é a mesma /conta do cliente.
// Admin ligado a um profissional também abre esta tela, com o menu de admin.
export default async function BarbeiroLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return <PanelFrame area={user?.role === "admin" ? "admin" : "barbeiro"}>{children}</PanelFrame>;
}
