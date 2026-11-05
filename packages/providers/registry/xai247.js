/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "xai247",
  alias: "xai247",
  category: "apikey",
  // ── auth hints ───────────────────────────────────────────────────────────
  authType: "apikey",
  hasOAuth: false,
  authModes: ["apikey"],
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "XAI247",
    icon: "bolt",
    color: "#0EA5E9",
    textIcon: "X2",
    website: "https://xai247.xyz",
    notice: {
      text: "Gateway tương thích OpenAI & Anthropic. Lấy API key trong Dashboard → Quickstart.",
      apiKeyUrl: "https://xai247.xyz/dashboard/quickstart",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    // OpenAI-compatible base: https://xai247.xyz/v1 (auth: `Authorization: Bearer <key>`;
    // the service also accepts `x-api-key: <key>`). It additionally exposes an
    // Anthropic-compatible surface rooted at https://xai247.xyz (/v1/messages) — not wired
    // here: the OpenAI path already covers every model, and the translator handles
    // client-side Claude format → OpenAI.
    baseUrl: "https://xai247.xyz/v1/chat/completions",
    // Standard OpenAI-compatible model list; the exact response shape hasn't been verified
    // against a real key yet — suggestions fail open if it differs.
    validateUrl: "https://xai247.xyz/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 3 }, 503: { attempts: 3 } },
    // Reference links for humans (same status as kira.js's usage block) — not fetched
    // programmatically. The dashboard's account data lives under /api/* (/api/usage,
    // /api/announcements): both answer 401 {"error":"unauthenticated"} for a missing
    // key AND for a bearer/x-api-key header, while /v1/* answers a different shape
    // ("invalid_api_key") — so /api/* is dashboard-session auth, not API-key auth, and
    // no usage handler can be wired up with a connection's API key.
    usage: {
      url: "https://xai247.xyz/dashboard/usage",
      announcementsUrl: "https://xai247.xyz/dashboard/announcements",
    },
    modelsFetcher: { url: "https://xai247.xyz/v1/models", type: "openai" },
  },
  models: [
    // Full catalog from the public GET https://xai247.xyz/api/models (no auth, re-synced 2026-11-05:
    // 17 models, all billingKind "pack" = need a pack/plan on the site, so none is free). The old
    // free gpt-5.6-terra and gpt-6-luna, gpt-6.1-sol, claude-haiku-5-5, claude-sonnet-5-5 are gone.
    { id: "claude-fable-5", name: "Claude Fable 5" },
    { id: "claude-fable-5.1", name: "Claude Fable 5.1" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-opus-5.5", name: "Claude Opus 5.5" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "glm-5.3", name: "GLM 5.3" },
    { id: "glm-5.3-flash", name: "GLM 5.3 Flash" },
    { id: "kimi-k3", name: "Kimi K3" },
    { id: "qwen3.8-flash", name: "Qwen3.8 Flash" },
    { id: "qwen3.8-max", name: "Qwen3.8 Max" },
  ],
  // Let users add any other id the gateway exposes later without a code change.
  passthroughModels: true,
  serviceKinds: ["llm"],
};
