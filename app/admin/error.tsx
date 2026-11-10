"use client";

import Link from "next/link";
import { useEffect } from "react";
import { primaryButton, secondaryButton } from "@/app/_components/ui";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="m-auto flex max-w-md flex-col items-center py-16 text-center">
      <p className="text-xs font-semibold tracking-widest text-black/50">ERRO</p>
      <h1 className="mt-2 text-2xl font-bold text-black">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-sm text-black/70">
        Nada foi perdido. Tente de novo; se continuar, volte ao início e repita o que estava fazendo.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-black/40">Código: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => retry()} className={primaryButton}>
          Tentar de novo
        </button>
        <Link href="/admin" className={secondaryButton}>
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
