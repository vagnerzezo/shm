import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O servidor de teste (pnpm test:server) usa outra pasta para rodar ao lado do `next dev`.
  // As regras para agentes ficam em app/doc/ (AGENTS.md, CLAUDE.md); não recriar na raiz.
  agentRules: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Service worker dos avisos no celular: sempre a versão nova e só código do próprio site.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
