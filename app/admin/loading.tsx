// Esqueleto exibido enquanto uma tela do admin carrega (a sidebar continua visível).
export default function AdminLoading() {
  const block = "animate-pulse rounded-xl bg-black/[0.07]";
  return (
    <div role="status" aria-label="Carregando" className="flex flex-1 flex-col">
      <div className={`${block} h-9 w-48`} />
      <div className={`${block} mt-3 h-4 w-72 max-w-full`} />
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-20`} />
        ))}
      </div>
      <div className={`${block} mt-4 min-h-64 flex-1`} />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
