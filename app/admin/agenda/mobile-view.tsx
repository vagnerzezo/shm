"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { agendaHref } from "@/app/_lib/agenda";

/** Sem visão escolhida na URL, o celular abre no dia: semana e mês não cabem na tela. */
export function MobileDefaultView({ date }: { date: string }) {
  const router = useRouter();
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) router.replace(agendaHref("dia", date));
  }, [date, router]);
  return null;
}
