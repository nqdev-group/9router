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
    // programmatically. The dashboard's data lives under /api/* (e.g. /api/usage,
    // /api/announcements), which answers 401 "unauthenticated" without a dashboard
    // session; whether an API key is accepted there is unverified, so no usage handler
    // is wired up yet.
    usage: {
      url: "https://xai247.xyz/dashboard/usage",
      announcementsUrl: "https://xai247.xyz/dashboard/announcements",
    },
    modelsFetcher: { url: "https://xai247.xyz/v1/models", type: "openai" },
  },
  models: [
    // Only model listed on https://xai247.xyz/dashboard/models (2026-10-13).
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },
  ],
  // Let users add any other id the gateway exposes later without a code change.
  passthroughModels: true,
  serviceKinds: ["llm"],
};
