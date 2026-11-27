import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { displayClass } from "./client/ui";

// Estilos e peças comuns a todas as telas do painel. Antes cada tela tinha a
// própria cópia; mude aqui para mudar em todas.

export const card = "rounded-[18px] border border-[#e7e5e4] bg-white";
export const fieldClass =
  "h-11 w-full rounded-xl border border-[#e7e5e4] bg-white px-3 text-base text-[#121212] placeholder:text-[#6b6b69] focus:border-[#121212] focus:outline-none disabled:bg-[#f5f5f4] disabled:text-[#6b6b69] lg:text-sm";
export const labelClass = "block text-[13px] font-semibold text-[#3f3f3d]";
export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#121212] px-5 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-wait disabled:opacity-70";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e7e5e4] bg-white px-4 text-sm font-semibold text-[#121212] transition hover:border-[#121212] disabled:opacity-60";
export const dangerButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b91c1c] px-4 text-sm font-semibold text-white transition hover:bg-[#991b1b] disabled:cursor-wait disabled:opacity-70";
export const linkButton = "text-sm font-semibold text-[#5c5c5a] underline-offset-4 hover:text-[#121212] hover:underline";
export const dangerLink = "text-sm font-semibold text-[#b91c1c] underline-offset-4 hover:underline";
export const scrollArea = "min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]";

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <h1 className={cn(displayClass, "text-[38px] break-words text-[#121212] lg:text-5xl")}>{title}</h1>
      {description && <p className="mt-1.5 text-sm text-[#5c5c5a]">{description}</p>}
    </>
  );
}

type Tone = "dark" | "muted" | "red" | "outline" | "amber" | "green";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "dark" && "bg-[#121212] text-white",
        tone === "muted" && "bg-[#f0efee] text-[#44403c]",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "amber" && "bg-amber-50 text-amber-800",
        tone === "green" && "bg-emerald-50 text-emerald-800",
        tone === "outline" && "border border-[#e7e5e4] text-[#5c5c5a]",
      )}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[13px] font-semibold text-[#5c5c5a]">{label}</p>
      <p className="mt-0.5 truncate text-2xl font-bold tracking-tight text-[#121212] lg:text-[28px]">{value}</p>
      {hint && <p className="truncate text-[13px] text-[#5c5c5a]">{hint}</p>}
    </>
  );
  const className = cn(card, "block px-4 py-3.5 lg:px-[22px] lg:py-4");
  return href ? (
    <a href={href} className={cn(className, "transition hover:border-[#121212]")}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[18px] border border-dashed border-[#d6d3d1] px-6 py-14 text-center text-sm text-[#5c5c5a]">
      {children}
    </p>
  );
}

export function FormError({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800", className)}>
      {message}
    </p>
  );
}
