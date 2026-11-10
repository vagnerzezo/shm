import type { DispatchStatus } from "@/app/_lib/db";
import { Badge } from "@/app/_components/ui";

// Peças só do Marketing; as comuns vêm de `app/_components/ui`.
export {
  Badge,
  card,
  fieldClass,
  labelClass,
  linkButton,
  primaryButton,
  secondaryButton,
  Stat,
} from "@/app/_components/ui";

const statusTone: Record<DispatchStatus, "dark" | "muted" | "red" | "outline"> = {
  enviado: "dark",
  pendente: "outline",
  enviando: "outline",
  falha: "red",
  cancelado: "muted",
};

const statusLabel: Record<DispatchStatus, string> = {
  enviado: "Enviado",
  pendente: "Pendente",
  enviando: "Enviando",
  falha: "Falha",
  cancelado: "Cancelado",
};

export function StatusBadge({ status }: { status: DispatchStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}

export const dispatchStatuses = Object.entries(statusLabel).map(([id, label]) => ({
  id: id as DispatchStatus,
  label,
}));
