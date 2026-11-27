import { Barlow_Condensed } from "next/font/google";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Peças da área do cliente (redesign de 2026-11-26). O admin continua com
// `app/_components/ui.tsx`.

/** Fonte dos títulos, a mesma do login. Aplicada na raiz da moldura do cliente. */
export const displayFont = Barlow_Condensed({ subsets: ["latin"], weight: ["800"], variable: "--font-display" });
export const displayClass = "font-[family-name:var(--font-display)] font-extrabold uppercase leading-none";

export const clientCard = "rounded-[18px] border border-[#e7e5e4] bg-white";
export const clientMuted = "text-[#5c5c5a]";
export const clientPrimary =
  "inline-flex h-13 items-center justify-center gap-2 rounded-[14px] bg-[#121212] px-6 text-[15px] font-bold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40";
export const clientSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e7e5e4] bg-white px-4 text-sm font-semibold text-[#121212] transition hover:border-[#121212]";
export const clientDangerText =
  "inline-flex h-10 items-center justify-center rounded-[10px] px-3 text-sm font-semibold text-[#b91c1c] transition hover:bg-red-50";
/** Campo de texto: 16 px no toque para o iPhone não dar zoom. */
export const clientField =
  "w-full rounded-[14px] border border-[#e7e5e4] bg-white px-3.5 text-base text-[#121212] placeholder:text-[#6b6b69] focus:border-[#121212] focus:outline-none lg:text-sm";

export function ClientTitle({
  title,
  kicker,
  description,
  className,
}: {
  title: string;
  /** Linha pequena acima do título (ex.: a data de hoje). */
  kicker?: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {kicker && <p className={cn("text-[13px] font-semibold lg:text-sm", clientMuted)}>{kicker}</p>}
      <h1 className={cn(displayClass, "mt-0.5 text-[38px] break-words lg:mt-1 lg:text-[52px]")}>{title}</h1>
      {description && <p className={cn("mt-1.5 text-sm", clientMuted)}>{description}</p>}
    </div>
  );
}

/** Contador vermelho (mensagens não lidas). */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} não ${count === 1 ? "lida" : "lidas"}`}
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full bg-[#dc2626] px-1.5 text-[11px] font-bold text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
