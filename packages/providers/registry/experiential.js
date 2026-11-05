/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "experiential",
  alias: "experiential",
  category: "apikey",
  // ── auth hints ───────────────────────────────────────────────────────────
  authType: "apikey",
  hasOAuth: false,
  authModes: ["apikey"],
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "Experiential Labs",
    icon: "science",
    color: "#10B981",
    textIcon: "EX",
    website: "https://platform.experientiallabs.ai",
    notice: {
      text: "Gateway tương thích OpenAI, có model miễn phí (jev-latest). Xem giới hạn tốc độ tại Settings → Limits.",
      apiKeyUrl: "https://platform.experientiallabs.ai/overview",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    // OpenAI-compatible base: https://api.experientiallabs.ai/v1 (auth: `Authorization:
    // Bearer <key>`; the service also accepts `x-api-key: <key>`). GET /v1/models answers
    // 401 invalid_key without a key (verified 2026-10-13), so the list needs a real key.
    baseUrl: "https://api.experientiallabs.ai/v1/chat/completions",
    validateUrl: "https://api.experientiallabs.ai/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 3 }, 503: { attempts: 3 } },
    // Reference links for humans (same status as kira.js's usage block) — not fetched
    // programmatically; the dashboard pages sit behind a session login, and no API-key
    // usage endpoint is documented, so no usage handler is wired up.
    usage: {
      url: "https://platform.experientiallabs.ai/spend",
      docsUrl: "https://platform.experientiallabs.ai/docs",
      modelsUrl: "https://platform.experientiallabs.ai/models",
      limitsUrl: "https://platform.experientiallabs.ai/settings/limits",
    },
    modelsFetcher: { url: "https://api.experientiallabs.ai/v1/models", type: "openai" },
  },
  models: [
    // Free models, ids confirmed by the user from the platform docs (2026-10-13). The
    // catalog lists ~1100 models whose other API ids aren't published without a key —
    // modelsFetcher and passthroughModels cover the rest instead of guessing ids here.
    { id: "clef-flash", name: "Clef Flash (Miễn phí)" },
    { id: "clef", name: "Clef (Miễn phí)" },
    { id: "gpt-6-luna-decisions", name: "GPT-6 Luna Decisions (Miễn phí)" },
    { id: "jev-latest", name: "Jev Latest (Miễn phí)" },
  ],
  passthroughModels: true,
  serviceKinds: ["llm"],
};
