/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "meta-llm",
  alias: "meta-llm",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "Meta LLM",
    icon: "smart_toy",
    color: "#0668E1",
    textIcon: "ML",
    website: "https://dev.meta.ai",
    notice: {
      // Two pricing tiers per docs (https://dev.meta.ai/docs/models): "Standard" (higher
      // cost, prompts/completions excluded from training) vs "Contributor" (heavily
      // discounted in exchange for granting Meta permission to train on your traffic) —
      // see muse-spark-1.2-contributor below.
      text: "API tương thích OpenAI SDK. Gói Standard giá cao hơn nhưng không dùng dữ liệu để train; gói Contributor giá rẻ hơn đổi lại cho phép Meta train trên prompt/completion của bạn.",
      apiKeyUrl: "https://dev.meta.ai/api-keys/",
      signupUrl: "https://dev.meta.ai/api-keys/",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://api.meta.ai/v1/chat/completions",
    format: "openai",            // docs show OpenAI Python SDK examples against this base URL.
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // "usage" isn't wired to a live JSON API — dev.meta.ai's dashboards are login-gated
    // (project_id/team_id-scoped), so these are reference links for humans only, same
    // status as kira.js's usage block.
    usage: {
      url: "https://dev.meta.ai/models/",
      pricingUrl: "https://dev.meta.ai/docs/models",
    },
    // No modelsFetcher: /v1/models on api.meta.ai isn't confirmed live (the models
    // listing page on dev.meta.ai is login-gated, redirects to auth.meta.com) — add
    // once a real endpoint is verified.
  },
  models: [
    // Context windows per https://dev.meta.ai/docs/models: 1,048,576 tokens for all
    // Muse Spark variants; accepts text/image/video/PDF input, text output.
    { id: "muse-spark-1.1", name: "Muse Spark 1.1" },
    { id: "muse-spark-1.2", name: "Muse Spark 1.2" },
    // Contributor tier: heavily discounted pricing in exchange for granting Meta
    // permission to train future models on your prompts/completions.
    { id: "muse-spark-1.2-contributor", name: "Muse Spark 1.2 (Contributor)" },
    // Muse Glimmer: 30B-param open-source multimodal model distilled from Muse Spark,
    // for local agentic workflows — text+image input, text output, 128K default context
    // (https://dev.meta.ai/docs/muse-glimmer). Model id not confirmed in the fetched
    // excerpt; using the docs' display name as a best-effort slug.
    { id: "muse-glimmer", name: "Muse Glimmer" },
    // Muse Image 1.0 — generation/edit endpoints below (https://dev.meta.ai/docs/image-generation).
    { id: "muse-image-1.0", name: "Muse Image 1.0", type: "image", params: ["n", "size"] },
  ],
  // ── Service kinds ────────────────────────────────────────────────────────
  serviceKinds: ["llm", "image"],
  imageConfig: {
    baseUrl: "https://api.meta.ai/v1/images/generations",
    // Editing endpoint also documented: POST https://api.meta.ai/v1/images/edits.
    // size is "WxH" and only sets aspect ratio (generator picks its own resolution);
    // n accepts 1-10; output_format defaults to "webp" (also "png"/"jpeg"); response_format
    // defaults to "b64_json" (also "url"). Not modeled as distinct `params` entries above
    // since the registry schema's `params` list is a flat allowlist, not per-field metadata.
  },
};
