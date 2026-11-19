export async function register() {
  // O motor usa o Postgres pelo driver `pg`, que só roda no runtime Node.
  // Na Vercel o servidor não fica ligado: quem roda o marketing é o cron (vercel.json).
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startMarketingScheduler } = await import("./app/_lib/marketing-scheduler");
    startMarketingScheduler();
  }
}
