/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "hhtechapi",
  alias: "hhtechapi",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "HHTechAPI",
    icon: "smart_toy",
    color: "#2563EB",
    textIcon: "HH",
    website: "https://hhtechapi.com",
    notice: {
      // Credit-based prepaid model (verified live on the landing page, 2026-09-03):
      // "1.000đ = 1.000 credit", min deposit 50.000đ / max 3.000.000đ, no free tier.
      // Deposit bonuses: +5% from 300k, +10% from 500k, +15% from 1tr.
      text: "Nạp credit trả trước (1.000đ = 1.000 credit, tối thiểu 50.000đ). Không có gói miễn phí — tặng thêm +5%/+10%/+15% theo mức nạp. Trừ theo token/lượt dùng, request lỗi không bị trừ credit.",
      apiKeyUrl: "https://hhtechapi.com/portal/#/keys",
      // User's own referral link.
      signupUrl: "https://hhtechapi.com/portal/?ref=FRPXZDA5",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    // The portal/marketing site is hhtechapi.com, but the actual API host documented at
    // https://hhtechapi.com/setup.html is the sibling domain hhtechapi.net — both the
    // OpenAI-compatible (/v1/chat/completions) and Anthropic-compatible (/v1/messages,
    // x-api-key + anthropic-version headers) routes live there, confirmed live with a real
    // key (2026-09-03: both return the "hết credit" balance error, not 404/401-invalid-key).
    // This entry wires the OpenAI-compatible route since that's this repo's intermediate
    // translation format.
    baseUrl: "https://hhtechapi.net/v1/chat/completions",
    // format: "openai",            // "openai" | "claude" | "gemini" | "openai-responses" | ...
    validateUrl: "https://hhtechapi.net/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // "usage" isn't wired to a live JSON API (no entry in open-sse/services/usage.js's
    // USAGE_HANDLERS) — these are reference links for humans, not fetched programmatically.
    usage: {
      url: "https://hhtechapi.com/portal/#/realtime",
      pricingUrl: "https://hhtechapi.com/portal/#/models",
    },
    // GET https://hhtechapi.net/v1/models — confirmed live with a real key (2026-09-03,
    // 200 + standard OpenAI-compatible { data: [...] } shape). Also true, separately, that it
    // 401s with no key at all — route exists and is authenticated either way.
    modelsFetcher: { url: "https://hhtechapi.net/v1/models", type: "openai" },
  },
  // Seed list = every chat-model id backed by a real credit rate in the public, unauthenticated
  // https://hhtechapi.com/portal/api/public/models feed (verified live, 2026-09-03 — see the
  // "hhtechapi" block in packages/providers/pricing.js for the $/1M conversion + full sourcing
  // notes). The live /v1/models catalog (confirmed with a real key) has ~50 more ids beyond this
  // seed — mostly duplicate/legacy "claude-*"-prefixed aliases whose display_name doesn't match
  // the id (e.g. id "claude-sonnet-3.7" displays as "DSV4 Tặng") and aren't in the pricing feed —
  // left out as unpriced/unclear rather than guessed; passthroughModels still covers them.
  models: [
    { id: "claude-fable-5-1", name: "Claude Fable 5.1", type: "chat" },
    { id: "claude-fable-5", name: "Claude Fable 5", type: "chat" },
    { id: "claude-opus-5", name: "Claude Opus 5", type: "chat" },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8", type: "chat" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7", type: "chat" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", type: "chat" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", type: "chat" },
    { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", type: "chat" },
    { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "chat" },
    { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", type: "chat" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", type: "chat" },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", type: "chat" },
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", type: "chat" },
    { id: "gpt-5.5", name: "GPT-5.5", type: "chat" },
    { id: "gpt-5.4", name: "GPT-5.4", type: "chat" },
    { id: "gpt-5.3-codex-spark", name: "GPT-5.3 Codex Spark", type: "chat" },
    { id: "grok-4.6", name: "Grok 4.6 Heavy", type: "chat" },
    { id: "grok-4.5", name: "Grok 4.5 Heavy", type: "chat" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", type: "chat" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", type: "chat" },
    { id: "glm-5.2", name: "GLM 5.2", type: "chat" },
    { id: "glm-5.3-flash", name: "GLM 5.3 Flash", type: "chat" },
    { id: "kimi-k3", name: "Kimi K3", type: "chat" },
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", type: "chat" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", type: "chat" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", type: "chat" },
    { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus", type: "chat" },
    // Image — billed per request (see pricing feed's "từ N credit / request"), not per token,
    // so these are excluded from packages/providers/pricing.js's $/1M schema.
    { id: "gpt-image-2", name: "GPT Image 2", type: "image", params: ["n", "size"] },
    { id: "gemini-3-pro-image", name: "Gemini 3 Pro Image", type: "image", params: ["n", "size"] },
    { id: "gemini-3.1-flash-image", name: "Gemini 3.1 Flash Image", type: "image", params: ["n", "size"] },
    { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", type: "image", params: ["n", "size"] },
    { id: "grok-imagine-image", name: "Grok Imagine Image", type: "image", params: ["n", "size"] },
  ],
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  // POST https://hhtechapi.net/v1/videos/generations exists too (confirmed live: errors with
  // "Model \"test\" không có trong bảng giá hiện hành" — a model-not-found error, not 404/403 —
  // meaning the route is real) but no video model id was found anywhere in the live catalog or
  // the pricing feed, so "video" is left out rather than declaring a service with no known model.
  // POST https://hhtechapi.net/v1/audio/speech 404s — no TTS route.
  serviceKinds: ["llm", "image"],
  imageConfig: {
    baseUrl: "https://hhtechapi.net/v1/images/generations",
  },
};
