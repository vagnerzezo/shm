import type { MetadataRoute } from "next";

// App instalável (PWA): o celular usa isto para o ícone, o nome e a cor.
// Ícones gerados por scripts/gerar-icones-app.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studio Heitor Macks",
    short_name: "SHM",
    description: "Agendamento online do Studio Heitor Macks",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121212",
    theme_color: "#121212",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
