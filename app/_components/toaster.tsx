"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, XIcon } from "./icons";

type Tone = "success" | "error";
type Item = { id: number; message: string; tone: Tone };

const listeners = new Set<(item: Item) => void>();
let nextId = 1;

/** Mostra um aviso curto no canto da tela. Pode ser chamado de qualquer componente do navegador. */
export function toast(message: string, tone: Tone = "success") {
  const item = { id: nextId++, message, tone };
  for (const listener of listeners) listener(item);
}

const DURATION_MS = 4000;

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const add = (item: Item) => {
      setItems((current) => [...current.slice(-2), item]);
      setTimeout(() => setItems((current) => current.filter((i) => i.id !== item.id)), DURATION_MS);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2",
            item.tone === "success" ? "bg-[#121212] text-white" : "bg-red-700 text-white",
          )}
        >
          {item.tone === "success" ? (
            <CheckIcon className="mt-0.5 size-4 shrink-0" strokeWidth={3} />
          ) : (
            <XIcon className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
