"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { notices } from "@/app/_lib/notices";
import { toast } from "./toaster";

/** Mostra o aviso de `?aviso=` e tira o parâmetro da URL. */
export function FlashToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const key = params.get("aviso");

  useEffect(() => {
    if (!key) return;
    const message = notices[key as keyof typeof notices];
    if (message) toast(message);
    const rest = new URLSearchParams(params);
    rest.delete("aviso");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [key, params, pathname, router]);

  return null;
}
