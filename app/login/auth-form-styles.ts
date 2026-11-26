// Fora do arquivo "use client" para que páginas do servidor (ex.: Descadastrar) também usem.

export type Variant = "desktop" | "mobile";

// Computador: campos retos; botão em pílula, como no celular. Celular: o desenho de "Login mobile" (campos
// cinza-claro de 52px, botão em pílula, senha com mostrar/ocultar, +55 no telefone).
export const authFormStyles = {
  desktop: {
    label: "block text-sm font-semibold text-black",
    /** Espaço entre o rótulo e o campo (no contêiner, não no campo). */
    gap: "mt-2",
    input:
      "h-12 w-full rounded-lg border border-black/20 bg-white px-4 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none",
    // Botão igual ao do celular (pílula com sombra, sem ícone).
    button:
      "mt-2 flex h-14 w-full items-center justify-center rounded-full bg-[#111] text-base font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:bg-black/85 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-black disabled:cursor-wait disabled:opacity-70",
  },
  mobile: {
    label: "block text-[13px] font-semibold text-[#222]",
    gap: "mt-1.5",
    input:
      "h-[52px] w-full rounded-[14px] border-[1.5px] border-[#dcdcdc] bg-[#f5f5f5] px-4 text-[15px] text-[#111] placeholder:text-[#6b6b6b] focus:border-[#111] focus:bg-white focus:outline-none",
    button:
      "mt-2 flex h-14 w-full items-center justify-center rounded-full bg-[#111] text-base font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:bg-black/85 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-black disabled:cursor-wait disabled:opacity-70",
  },
} satisfies Record<Variant, Record<string, string>>;
