/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "kira",
  alias: "kira",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "Kira AI",
    icon: "smart_toy",
    color: "#8B5CF6",
    textIcon: "KR",
    website: "https://kiraai.vn",
    notice: {
      // Real tiers from https://kiraai.vn/models/: 50k tokens on signup, Cá nhân
      // 5,000,000 tokens/month, Dev 12,000,000 tokens/month — beyond that, per-model
      // metered pricing applies (see packages/providers/pricing.js's "kira" block).
      text: "Đăng ký nhận 50.000 token miễn phí. Gói Cá nhân 5.000.000 token/tháng, gói Dev 12.000.000 token/tháng — vượt hạn mức tính theo giá từng model.",
      apiKeyUrl: "https://kiraai.vn/developer/",
      // Kira's registration is a modal on the homepage (no dedicated /sign-up path) —
      // ?ref= affiliate query param.
      signupUrl: "https://kiraai.vn/?ref=nguyenquyitpro",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://kiraai.vn/api/v1/chat/completions",
    // format: "openai",            // "openai" | "claude" | "gemini" | "openai-responses" | ...
    validateUrl: "https://kiraai.vn/api/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // Per https://kiraai.vn/documents/ (verified live, 2026-09-17), Kira also exposes an
    // OpenAI Responses-API-compatible endpoint at POST /api/v1/responses (SSE, tool
    // calling — docs frame it as "Codex Integration"), plus authenticated account-mgmt
    // routes: GET /user/profile (VND + token balance, daily usage), GET /user/usage/logs
    // (paginated per-call log with cost_vnd), GET|POST /user/keys. None of these are
    // wired up here: /responses needs the same kind of dedicated executor github.js uses
    // for its `responsesUrl` (a generic baseUrl swap isn't enough — see
    // open-sse/executors/github.js), and the /user/* endpoints' exact response shape
    // hasn't been confirmed against a real API key yet. Candidates for a future PR, not
    // guessed at here.
    //
    // "usage" isn't wired to a live JSON API (Kira has no entry in open-sse/services/usage.js's
    // USAGE_HANDLERS) — these are reference links for humans, not fetched programmatically.
    usage: {
      url: "https://kiraai.vn/developer/",
      // Per-model rates shown on this page are the source for packages/providers/pricing.js's
      // "kira" block — kept here so the two stay traceable to the same origin.
      pricingUrl: "https://kiraai.vn/bang-gia/",
    },
    // "openai": endpoint returns the standard OpenAI-compatible { data: [...] } shape
    // (verified live via `curl https://kiraai.vn/api/v1/models`, 2026-09-03) — matches
    // the type used by every other modelsFetcher in this repo; "chat" is not a recognized
    // fetcher type (see src/app/api/providers/suggested-models/filters.js).
    modelsFetcher: { url: "https://kiraai.vn/api/v1/models", type: "openai" },
  },
  models: [
    // Free chat models — verified live (is_free:true in the /api/v1/models response,
    // 2026-09-03). "kira-mini-2.0" (previously declared here) no longer exists; the
    // live id is "kira-2.0", and it's free now (was paid at the time of the last check).
    { id: "kira-mini-1.0", name: "Kira Mini 1.0 (Miễn phí)", type: "chat" },
    { id: "kira-auto", name: "Kira Auto (Miễn phí)", type: "chat" },
    { id: "kira-2.0", name: "Kira 2.0 (Miễn phí)", type: "chat" },
    { id: "qwen3.8-flash", name: "Qwen3.8 Flash (Miễn phí)", type: "chat" },
    { id: "hy3", name: "Tencent: Hy3 Free (Miễn phí)", type: "chat" },
    { id: "glm-5.3-flash", name: "GLM 5.3 Flash (Miễn phí)", type: "chat" },
    { id: "mimo-v2.5", name: "MiMo V2.5 (Miễn phí)", type: "chat" },
    // Paid highlights. The "-free"-suffixed DeepSeek/Qwen ids previously listed here
    // ("deepseek-v4-pro-free", "deepseek-v4-flash-free", "deepseek-v4-flash-1b-free",
    // "qwen-3.8-27b-free", "qwen-3.8-max-free") no longer exist in the live catalog —
    // removed rather than left as dead ids.
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", type: "chat" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", type: "chat" },
    { id: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision Exp", type: "chat" },
    { id: "qwen3.8-max", name: "Qwen3.8 Max", type: "chat" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", type: "chat" },
    { id: "kira-3.0-image", name: "Kira 3.0 Image", type: "image", params: ["n", "size"] },
    { id: "kira-2.0-image", name: "Kira 2.0 Image", type: "image", params: ["n", "size"] },
    // Gemini-branded models served through Kira's gateway, no "kira-" prefix — ids
    // verified live.
    { id: "gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", type: "image", params: ["n", "size"] },
    { id: "gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image", type: "image", params: ["n", "size"] },
    { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.0-video", name: "Kira 3.0 Video", type: "video", params: [] },
    { id: "kira-3.0-video-flash", name: "Kira 3.0 Video Flash", type: "video", params: [] },
  ],
  // Live catalog (https://kiraai.vn/api/v1/models) has ~37 more chat models beyond this
  // seed (Claude, GPT-5.x, Gemini, Qwen, Kimi, GLM, Grok, MiMo tiers — see
  // packages/providers/pricing.js's "kira" block, though that table should be re-synced
  // against the live catalog separately — several of its ids, e.g. "kira-mini-2.0" and
  // the "-free"-suffixed DeepSeek variants, are already stale as of this file's update).
  // passthroughModels lets users pick any of them via modelsFetcher-driven suggestions
  // without listing every id here.
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  // No sttConfig: live catalog (https://kiraai.vn/api/v1/models) has no speech-to-text
  // model/endpoint listed, guessing common paths (/v1/audio/transcriptions, /v1/stt) both
  // 404'd, and the official API reference (https://kiraai.vn/documents/, checked
  // 2026-09-17) documents no STT route either — Kira doesn't offer it yet.
  serviceKinds: ["llm", "image", "video", "tts"],
  ttsConfig: {
    baseUrl: "https://kiraai.vn/api/v1/audio/speech",
    authType: "apikey",
    authHeader: "bearer",
    format: "openai",
    // "kira-2.5-flash" is a CHAT model, not TTS — it doesn't appear under TTS in the
    // live catalog. These 4 are the real TTS ids returned by
    // https://kiraai.vn/api/v1/models (type:"audio").
    models: [
      { id: "kira-3.0-flash-tts", name: "Kira 3.0 Flash TTS" },
      { id: "kira-2.0-flash-tts", name: "Kira 2.0 Flash TTS" },
      { id: "gemini-3.1-flash-tts-preview", name: "Gemini 3.1 Flash TTS Preview" },
      { id: "gemini-2.5-flash-tts", name: "Gemini 2.5 Flash TTS" },
    ],
    // Public voice ids per GET https://kiraai.vn/api/v1/audio/voices (verified live,
    // 2026-09-17) — that endpoint also returns each id's internal engine voice
    // ("mapped_to": alloy→Kore, echo→Fenrir, fable→Puck, onyx→Charon, nova→Aoede,
    // shimmer→Kore), which open-sse/handlers/ttsProviders/kira.js's VOICE_MAP mirrors
    // for the bare-voice (no explicit ttsModel) call shape. "shimmer" was previously
    // missing from both this list and that map.
    voices: [
      { id: "alloy", name: "Alloy (Nữ, miền Bắc)" },
      { id: "echo", name: "Echo (Nam, miền Bắc)" },
      { id: "fable", name: "Fable (Nữ, miền Nam)" },
      { id: "onyx", name: "Onyx (Nam, miền Nam)" },
      { id: "nova", name: "Nova (Nữ, miền Bắc)" },
      { id: "shimmer", name: "Shimmer (Nữ, miền Bắc)" },
    ],
  },
  imageConfig: {
    baseUrl: "https://kiraai.vn/api/v1/images/generations",
  },
  // Async video jobs: create at POST {baseUrl}/generations, poll at
  // GET {baseUrl}/operations/{request_id} — per https://kiraai.vn/documents/ and
  // confirmed live (POST .../generations and GET .../operations/{id} both 401
  // "Authentication required" — route exists; GET .../{id} without "operations/" 404s).
  // The poll path does NOT match the generic xai.js-shaped default in videoCore.js
  // (which polls {baseUrl}/{id}), so open-sse/handlers/videoProviders/kira.js provides
  // a dedicated adapter — this baseUrl is shared by both.
  videoConfig: {
    baseUrl: "https://kiraai.vn/api/v1/videos",
  },
};
