"use client";

import { useEffect, useState } from "react";
import { minutesToPx } from "@/app/_lib/agenda";
import { nowInStudio } from "@/app/_lib/availability";

/** Linha da hora atual; anda sozinha a cada minuto. */
export function NowLine({ start, end }: { start: number; end: number }) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setMinutes(nowInStudio().minutes);
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Só no cliente, para o horário não divergir entre servidor e navegador.
  if (minutes === null || minutes < start || minutes > end) return null;
  return (
    <div
      aria-hidden="true"
      style={{ top: minutesToPx(minutes, { start }) }}
      className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
    >
      <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
    </div>
  );
}
