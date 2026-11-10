import Link from "next/link";
import { primaryButton } from "@/app/_components/ui";

export default function AdminNotFound() {
  return (
    <div className="m-auto flex max-w-md flex-col items-center py-16 text-center">
      <p className="text-xs font-semibold tracking-widest text-black/50">404</p>
      <h1 className="mt-2 text-2xl font-bold text-black">Não encontramos isso</h1>
      <p className="mt-2 text-sm text-black/70">
        O cliente, reserva ou página pode ter sido removido, ou o endereço está incorreto.
      </p>
      <Link href="/admin" className={`${primaryButton} mt-6`}>
        Ir para o início
      </Link>
    </div>
  );
}
