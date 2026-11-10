import { runMarketing } from "./marketing";

// Roda o motor de marketing de tempos em tempos enquanto o servidor estiver
// no ar (next dev / next start). Para hospedagem sem servidor contínuo, use a
// rota POST /api/marketing/executar num cron externo.

const minutes = Math.max(1, Number(process.env.MARKETING_INTERVAL_MINUTES) || 15);

const globalForTimer = globalThis as typeof globalThis & { __marketingTimer?: NodeJS.Timeout };

export function startMarketingScheduler() {
  // No dev o módulo recarrega; sem isto, cada recarga criaria um timer novo.
  if (globalForTimer.__marketingTimer) return;
  const tick = () =>
    runMarketing().catch((error) => console.error("[marketing] falha ao executar:", error));
  setTimeout(tick, 30_000);
  globalForTimer.__marketingTimer = setInterval(tick, minutes * 60_000);
}
