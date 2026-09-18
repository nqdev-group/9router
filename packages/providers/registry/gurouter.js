/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "gurouter",
  alias: "gurouter",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "GuRouter",
    icon: "smart_toy",
    color: "#0891B2",
    textIcon: "GR",
    website: "https://gurouter.gulagi.com",
    notice: {
      // GuRouter runs on the "New API" panel (self-hosted OpenAI-proxy gateway) — account
      // registration is required even to use the free models below.
      apiKeyUrl: "https://gurouter.gulagi.com/keys",
      signupUrl: "https://gurouter.gulagi.com/register",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://gurouter.gulagi.com/v1/chat/completions",
    format: "openai",            // "New API" exposes a standard OpenAI Chat Completions endpoint.
    validateUrl: "https://gurouter.gulagi.com/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // "usage" isn't wired to a live JSON API (no entry in open-sse/services/usage.js's
    // USAGE_HANDLERS) — these are reference links for humans, not fetched programmatically.
    usage: {
      url: "https://gurouter.gulagi.com/usage-logs/common",
      pricingUrl: "https://gurouter.gulagi.com/pricing",
    },
    // "openai": /v1/models returns the standard OpenAI-compatible { data: [...] } shape —
    // matches the type used by every other modelsFetcher in this repo. Requires a valid
    // API key (verified live: 401 "Invalid token" without one), same as the chat endpoint.
    modelsFetcher: { url: "https://gurouter.gulagi.com/v1/models", type: "openai" },
  },
  // Seed list from the public, unauthenticated https://gurouter.gulagi.com/api/pricing feed
  // (checked 2026-08-28) — currently only 3 models are priced, all free ($0 in/out).
  // The vendor list in that same feed (OpenAI, Anthropic, DeepSeek, MiniMax) suggests more
  // paid models will be added over time; passthroughModels covers those without edits here.
  models: [
    { id: "poolside/laguna-s-2.1-free", name: "Poolside: Laguna S 2.1 (Miễn phí)" },
    { id: "minimax/minimax-m3-free", name: "MiniMax M3 (Miễn phí)" },
    { id: "minimax/minimax-m2.7-free", name: "MiniMax M2.7 (Miễn phí)" },
  ],
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  // Only a chat/completions endpoint is exposed today — no image/tts/stt endpoints found.
  serviceKinds: ["llm"],
};
