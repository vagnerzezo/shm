import type { Channel, DispatchStatus } from "@/app/_lib/db";
import { Badge, switchKnob, switchTrack } from "@/app/_components/ui";
import { setChannelEnabled } from "@/app/_lib/marketing-actions";
import { cn } from "@/lib/utils";

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
  switchClass,
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

/** Interruptor que liga ou desliga os envios automáticos de um canal. */
export function ChannelSwitch({ channel, enabled, label }: { channel: Channel; enabled: boolean; label: string }) {
  return (
    <form action={setChannelEnabled} className="flex">
      <input type="hidden" name="canal" value={channel} />
      <input type="hidden" name="ativo" value={String(!enabled)} />
      <button type="submit" role="switch" aria-checked={enabled} aria-label={label} className={cn(switchTrack, enabled && "bg-[#121212]")}>
        <span aria-hidden="true" className={cn(switchKnob, enabled && "translate-x-5")} />
      </button>
    </form>
  );
}
