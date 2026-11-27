// Fora do arquivo "use client" para que páginas do servidor (ex.: Descadastrar) também usem.

export type Variant = "desktop" | "mobile";

// Computador: o desenho "Entrar" do canvas desktop (campos de 52px, botão preto de 56px). Celular: o desenho de "Login mobile" (campos
// cinza-claro de 52px, botão em pílula, senha com mostrar/ocultar, +55 no telefone).
export const authFormStyles = {
  desktop: {
    label: "block text-sm font-semibold text-[#121212]",
    /** Espaço entre o rótulo e o campo (no contêiner, não no campo). */
    gap: "mt-2",
    input:
      "h-[52px] w-full rounded-[14px] border border-[#e7e5e4] bg-[#fafaf9] px-4 text-base text-[#121212] placeholder:text-[#78716c] focus:border-[#121212] focus:bg-white focus:outline-none",
    button:
      "mt-[10px] flex h-14 w-full items-center justify-center rounded-[14px] bg-[#121212] text-base font-bold text-white transition hover:bg-black/85 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-black disabled:cursor-wait disabled:opacity-70",
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
