import type { Channel, DispatchStatus } from "@/app/_lib/db";
import { Badge } from "@/app/_components/ui";
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

const track =
  "relative inline-block h-8 w-[52px] shrink-0 cursor-pointer rounded-full bg-[#d6d3d1] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212]";
const knob =
  "absolute top-[3px] left-[3px] size-[26px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform";

/** Caixa de marcar com cara de interruptor (use com `role="switch"`). */
export const switchClass = cn(
  track,
  "appearance-none before:absolute before:top-[3px] before:left-[3px] before:size-[26px] before:rounded-full before:bg-white before:shadow-[0_1px_3px_rgba(0,0,0,0.25)] before:transition-transform before:content-['']",
  "checked:bg-[#121212] checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-40",
);

/** Interruptor que liga ou desliga os envios automáticos de um canal. */
export function ChannelSwitch({ channel, enabled, label }: { channel: Channel; enabled: boolean; label: string }) {
  return (
    <form action={setChannelEnabled} className="flex">
      <input type="hidden" name="canal" value={channel} />
      <input type="hidden" name="ativo" value={String(!enabled)} />
      <button type="submit" role="switch" aria-checked={enabled} aria-label={label} className={cn(track, enabled && "bg-[#121212]")}>
        <span aria-hidden="true" className={cn(knob, enabled && "translate-x-5")} />
      </button>
    </form>
  );
}
