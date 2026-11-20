"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 5000;

/** Busca mensagens novas de tempos em tempos, enquanto a aba está visível. */
/** Recarrega os dados da tela de tempos em tempos (só com a aba visível). */
export function AutoRefresh({ intervalMs = INTERVAL_MS }: { intervalMs?: number } = {}) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
