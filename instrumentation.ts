export async function register() {
  // O motor usa o Postgres pelo driver `pg`, que só roda no runtime Node.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMarketingScheduler } = await import("./app/_lib/marketing-scheduler");
    startMarketingScheduler();
  }
}
