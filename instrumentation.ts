export async function register() {
  // O motor usa o disco (banco em JSON), então só roda no runtime Node.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMarketingScheduler } = await import("./app/_lib/marketing-scheduler");
    startMarketingScheduler();
  }
}
