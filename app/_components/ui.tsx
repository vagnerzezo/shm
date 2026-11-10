import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Estilos e peças comuns a todas as telas do painel. Antes cada tela tinha a
// própria cópia; mude aqui para mudar em todas.

export const card = "rounded-xl border border-black/10 bg-white/85";
export const fieldClass =
  "h-11 w-full rounded-lg border border-black/20 bg-white px-3 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none disabled:bg-black/5 disabled:text-black/50";
export const labelClass = "block text-xs font-semibold tracking-wide text-black/70";
export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#121212] px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-black/20 bg-white px-4 text-sm font-semibold text-black transition hover:bg-black/5 disabled:opacity-60";
export const dangerButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-70";
export const linkButton = "text-sm font-semibold text-black/70 underline-offset-4 hover:text-black hover:underline";
export const dangerLink = "text-sm font-semibold text-red-700 underline-offset-4 hover:underline";
export const scrollArea = "min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]";

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">{title}</h1>
      {description && <p className="mt-1 text-sm text-black/70">{description}</p>}
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
        tone === "muted" && "bg-black/10 text-black/70",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "amber" && "bg-amber-50 text-amber-800",
        tone === "green" && "bg-emerald-50 text-emerald-800",
        tone === "outline" && "border border-black/20 text-black/70",
      )}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold tracking-widest text-black/60">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-black">{value}</p>
      {hint && <p className="truncate text-xs text-black/60">{hint}</p>}
    </>
  );
  const className = cn(card, "block px-4 py-3");
  return href ? (
    <a href={href} className={cn(className, "transition hover:border-black/30")}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-black/25 py-14 text-center text-sm text-black/70">
      {children}
    </p>
  );
}

export function FormError({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800", className)}>
      {message}
    </p>
  );
}
