import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#d9d9d9] p-6">
      <div className="max-w-md rounded-2xl border border-black/15 bg-white/80 p-8 text-center backdrop-blur-xl">
        <p className="text-xs font-semibold tracking-widest text-black/50">404</p>
        <h1 className="mt-2 text-2xl font-bold text-black">Página não encontrada</h1>
        <p className="mt-2 text-sm text-black/70">O endereço pode estar incorreto ou a página foi removida.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-[#121212] px-5 text-sm font-semibold text-white transition hover:bg-black/80"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
