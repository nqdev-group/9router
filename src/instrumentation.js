export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initConsoleLogCapture } = await import("@/lib/consoleLogBuffer");
    initConsoleLogCapture();

    // Server-only: lets capabilities.js read the synced catalog without pulling
    // node:fs into the dashboard's browser bundle.
    const { installCatalogSource } = await import("open-sse/providers/catalogOverride.js");
    await installCatalogSource();

    const { startModelCatalogSync } = await import("@/lib/modelCatalog/sync.js");
    startModelCatalogSync();

    // Combo auto-reorder sweep also starts from src/app/layout.js (via
    // shared/services/bootstrap.js -> initializeApp), but that side effect only
    // fires when Next.js loads a dashboard *page* route — an API-only deployment
    // (clients calling /v1/chat/completions directly, dashboard UI never opened
    // since the last restart) never renders layout.js, so the sweep never starts
    // and no combo ever gets auto-reordered even though the feature is enabled.
    // register() runs once at process boot regardless of route type, so start it
    // here too; startComboAutoReorderSweep() is idempotent (no-op if already
    // started), same belt-and-suspenders pattern already used for
    // backgroundTokenRefresh in custom-server.js.
    const { startComboAutoReorderSweep } = await import("@/lib/comboAutoReorder/scheduler.js");
    startComboAutoReorderSweep().catch((e) => console.log("[ComboAutoReorder] scheduler start failed:", e.message));
  }
}
