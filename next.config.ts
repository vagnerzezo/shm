import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O servidor de teste (pnpm test:server) usa outra pasta para rodar ao lado do `next dev`.
  // As regras para agentes ficam em app/doc/ (AGENTS.md, CLAUDE.md); não recriar na raiz.
  agentRules: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
