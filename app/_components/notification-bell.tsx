"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { markBellSeenAction } from "@/app/_lib/actions";
import { formatListTime } from "@/app/_lib/chat-format";
import type { BellItem } from "@/app/_lib/notifications";
import { cn } from "@/lib/utils";

/** O que a moldura do painel sabe da pessoa e passa para o cabeçalho de cada tela. */
type PanelValue = { bell: { unseen: number; items: BellItem[] } | null; profileHref: string };
type PanelContext = PanelValue & { seenAll: boolean; markSeen: () => void };

const Ctx = createContext<PanelContext | null>(null);

/**
 * Fica no layout, que continua montado ao trocar de página: guarda o "já vi"
 * para o número não voltar enquanto o servidor ainda não mandou a versão nova.
 */
export function PanelProvider({ value, children }: { value: PanelValue; children: ReactNode }) {
  const router = useRouter();
  const [seenAll, setSeenAll] = useState(false);
  // Chegou aviso novo do servidor (o número dele mudou): volta a mostrar.
  const lastUnseen = useRef(value.bell?.unseen ?? 0);
  useEffect(() => {
    const unseen = value.bell?.unseen ?? 0;
    if (unseen > 0 && unseen !== lastUnseen.current) setSeenAll(false);
    lastUnseen.current = unseen;
  }, [value.bell?.unseen]);
  const markSeen = () => {
    setSeenAll(true);
    // Até o aviso mais novo da lista na tela (vem ordenada): um que chegue depois continua novo.
    void markBellSeenAction(value.bell?.items[0]?.at).then(() => router.refresh());
  };
  return <Ctx.Provider value={{ ...value, seenAll, markSeen }}>{children}</Ctx.Provider>;
}

export const usePanel = () => useContext(Ctx);

const iconButton =
  "relative grid size-11 place-items-center rounded-full border border-black/15 bg-white text-black transition hover:border-black/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

/** Sino de notificações: número de não vistos; abrir marca tudo como visto. */
export function NotificationBell() {
  const panel = usePanel();
  const bell = panel?.bell;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Zera na hora ao abrir; volta a valer o do servidor quando chegar um aviso novo.
  const unseen = panel?.seenAll ? 0 : (bell?.unseen ?? 0);

  useEffect(() => {
    if (!open) return;
    // Ao abrir, o foco vai para a lista; Esc fecha e devolve o foco ao sino.
    panelRef.current?.focus();
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        setOpen(false);
        button.current?.focus();
      } else if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!bell) return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unseen > 0) panel?.markSeen();
  }

  return (
    <div ref={box} className="relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-label={unseen > 0 ? `Notificações: ${unseen} ${unseen === 1 ? "nova" : "novas"}` : "Notificações"}
        aria-expanded={open}
        className={iconButton}
      >
        <Bell aria-hidden="true" className="size-4" />
        {unseen > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs leading-5 font-bold text-white">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Notificações"
          className="absolute top-13 right-0 z-30 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-2xl outline-none"
        >
          <p className="border-b border-black/10 px-4 py-3 text-sm font-bold text-black">Notificações</p>
          {bell.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-black/60">Nada novo por aqui.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-black/10 overflow-y-auto">
              {bell.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-black/[0.03]"
                  >
                    <span
                      aria-hidden="true"
                      className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.unseen ? "bg-red-600" : "bg-transparent")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm text-black", item.unseen && "font-semibold")}>{item.text}</span>
                      <span className="block text-xs text-black/50">{formatListTime(item.at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
