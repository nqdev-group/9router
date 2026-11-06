// Pricing overrides for custom providers registered in packages/providers/registry/
// (i.e. providers that don't come from the upstream open-sse merge — see AGENTS.md
// "Provider system"). Rates are $/1M tokens, same shape as open-sse/providers/pricing.js.
//
// Merged into getPricingForModel() in open-sse/providers/pricing.js as a
// provider-specific override, checked alongside that file's own PROVIDER_PRICING —
// see the "Provider-specific override" step there.
//
// revidapi is excluded: its only models are TTS engines (edge/capcut/google), billed
// per character/audio-second, not per token — outside the scope of this $/1M schema.
// Likewise image/video models on kira and codely are excluded (no chat token pricing).
// aimlapi's image model (gemini-3-pro-image-preview) and STT model (aai/slam-1, billed
// per audio-second) are excluded for the same reason.
//
// Sourcing notes (so numbers can be re-verified/updated, not just trusted blindly):
//   - Where a provider resells a well-known upstream model as-is (vilao, zenmux),
//     the rate mirrors the canonical entry in open-sse/providers/pricing.js.
//   - Where the provider has a published real per-token rate (SambaNova Cloud, Kira AI's
//     live pricing API, OpenCode Zen's own pricing page), that rate is used directly
//     (see inline comments per provider).
//   - Where the provider genuinely offers free access (llm7's public quota, kira's
//     "(Free)"/"-free" models, zenmux's/opencode-zen's "-free" ids), price is $0.
//   - Where no official per-model rate is published (codely's kiro-auto, opencode-zen's
//     claude-sonnet-4), the value is an explicit estimate mirroring the nearest comparable
//     tier — flagged "estimated".

export const PROVIDER_PRICING = {
  // === Experiential Labs (experientiallabs.ai) ===
  // Source: https://platform.experientiallabs.ai/models (checked 2026-10-13). jev-latest is
  // listed at $0 (list price $0.042/M input, 100% discounted); other ids come in through
  // passthroughModels and fall back to the default estimate. clef/clef-flash are promo-free
  // ($0.24 / $0.09 per 1M input list price); gpt-6-luna-decisions lists $0.10 input / $0 output
  // — input kept at the list price, output is free.
  experiential: {
    "clef-flash": { input: 0, output: 0, cached: 0, cache_creation: 0 },
    "clef": { input: 0, output: 0, cached: 0, cache_creation: 0 },
    "gpt-6-luna-decisions": { input: 0.10, output: 0, cached: 0, cache_creation: 0 },
    "jev-latest": { input: 0, output: 0, cached: 0, cache_creation: 0 },
  },
  // === BeatAPI (beatapi.io) ===
  // [nqdev] Source: https://beatapi.io/pricing (checked 2026-11-05), cross-checked against the public
  // GET https://api.beatapi.io/v1/text/models (no auth) — input/output match it exactly for every model
  // on both. Rates are $/1M tokens. The catalog's `discount` field is NOT applied on top: the pricing
  // page's `beatapiUsd` already equals the catalog's input_usd_per_million (e.g. glm-5.3-flash: 0.06 vs
  // official 0.15 → the catalog price is the discounted, net price).
  // `cached` = "Cached input" and `cache_creation` = "Cache write" (5-minute) rows of that page; where
  // the page lists no such row the plain input rate is used (upper-bound estimate). Not modelled: the
  // 1h cache-write rate, tiered long-context rows (200k+/272k+/512k+), and time-of-day multipliers
  // (the two DeepSeek "-hc" models double on weekday peak hours; hy3 has its own peak window).
  // MiniMax-M3 / M3.1-Flash are in the catalog but absent from the pricing page — catalog rates used.
  // "-free" ids (deepseek-v4.1-flash-free, glm-5.3-flash-free, hy4-free) carry no price: $0.
  // Catalog churns — re-sync from the pricing page rather than trusting this snapshot.
  beatapi: {
    "deepseek-v4.1-flash-free": { input: 0, output: 0, cached: 0, cache_creation: 0 },
    "glm-5.3-flash-free": { input: 0, output: 0, cached: 0, cache_creation: 0 },
    "hy4-free": { input: 0, output: 0, cached: 0, cache_creation: 0 },
    "claude-fable-5-1": { input: 5, output: 25, cached: 0.125, cache_creation: 6.25 },
    "claude-haiku-4-5-20251001": { input: 0.5, output: 2.5, cached: 0.05, cache_creation: 0.625 },
    "claude-haiku-5-5": { input: 0.05, output: 0.25, cached: 0.005, cache_creation: 0.0625 },
    "claude-opus-5": { input: 2.5, output: 12.5, cached: 0.25, cache_creation: 3.125 },
    "claude-opus-5-5": { input: 2, output: 10, cached: 0.1, cache_creation: 2.5 },
    "claude-sonnet-5": { input: 1, output: 5, cached: 0.1, cache_creation: 1.25 },
    "claude-sonnet-5-5": { input: 1, output: 5, cached: 0.1, cache_creation: 1.25 },
    "gpt-5.6-luna": { input: 0.08, output: 0.48, cached: 0.008, cache_creation: 0.1 },
    "gpt-5.6-sol": { input: 2, output: 12, cached: 0.2, cache_creation: 2.5 },
    "gpt-5.6-terra": { input: 1, output: 6, cached: 0.1, cache_creation: 1.25 },
    "gpt-6-astra": { input: 4, output: 20, cached: 0.4, cache_creation: 4 },
    "gpt-6-luna": { input: 0.04, output: 0.2, cached: 0.004, cache_creation: 0.05 },
    "gpt-6-sol": { input: 0.8, output: 4, cached: 0.08, cache_creation: 1 },
    "gpt-6.1-sol": { input: 0.8, output: 4, cached: 0.04, cache_creation: 1 },
    "gpt-6.1-terra": { input: 0.4, output: 2, cached: 0.02, cache_creation: 0.5 },
    "deepseek-v4-flash-0731": { input: 0.11, output: 0.33, cached: 0.0035, cache_creation: 0.11 },
    "deepseek-v4-pro-0813": { input: 0.33, output: 0.99, cached: 0.011, cache_creation: 0.33 },
    "deepseek-v4.1-flash": { input: 0.075, output: 0.3, cached: 0.0015, cache_creation: 0.075 },
    "deepseek-v4-pro-0813-hc": { input: 0.462, output: 1.386, cached: 0.0154, cache_creation: 0.462 },
    "deepseek-v4.1-flash-hc": { input: 0.105, output: 0.42, cached: 0.0021, cache_creation: 0.105 },
    "gemini-3.1-pro-preview": { input: 1, output: 6, cached: 0.1, cache_creation: 1 },
    "gemini-3.6-flash": { input: 0.375, output: 1.875, cached: 0.0375, cache_creation: 0.375 },
    "gemini-3.7-flash": { input: 0.375, output: 1.875, cached: 0.0375, cache_creation: 0.375 },
    "gemini-3.8-flash": { input: 0.375, output: 1.875, cached: 0.0375, cache_creation: 0.375 },
    "gemini-4-argon": { input: 1, output: 5, cached: 0.05, cache_creation: 1 },
    "glm-5.3": { input: 0.56, output: 1.76, cached: 0.104, cache_creation: 0.56 },
    "glm-5.3-flash": { input: 0.06, output: 0.2, cached: 0.02, cache_creation: 0.06 },
    "glm-5.3-flashx": { input: 0.148, output: 0.5, cached: 0.03, cache_creation: 0.148 },
    "grok-4.5": { input: 0.7, output: 2.1, cached: 0.105, cache_creation: 0.7 },
    "grok-4.6": { input: 0.7, output: 2.1, cached: 0.175, cache_creation: 0.7 },
    "grok-4.7": { input: 0.7, output: 2.1, cached: 0.175, cache_creation: 0.7 },
    "hy3": { input: 0.033, output: 0.132, cached: 0.0083, cache_creation: 0.033 },
    "hy4-preview": { input: 0.3336, output: 1.0004, cached: 0.0168, cache_creation: 0.3336 },
    "kimi-k3": { input: 1.2, output: 6, cached: 0.12, cache_creation: 1.2 },
    "kimi-k3.1-pro": { input: 0.8, output: 4, cached: 0.08, cache_creation: 0.8 },
    "mimo-v2.5": { input: 0.056, output: 0.112, cached: 0.0011, cache_creation: 0.056 },
    "mimo-v2.6-flash": { input: 0.056, output: 0.112, cached: 0.0011, cache_creation: 0.056 },
    "MiniMax-M3": { input: 0.12, output: 0.48, cached: 0.12, cache_creation: 0.12 },
    "MiniMax-M3.1-Flash": { input: 0.06, output: 0.24, cached: 0.06, cache_creation: 0.06 },
    "muse-wonder": { input: 4, output: 20, cached: 0.2, cache_creation: 4 },
    "qwen3.8-flash": { input: 0.06, output: 0.188, cached: 0.0064, cache_creation: 0.08 },
    "qwen3.8-max": { input: 0.8, output: 2.4, cached: 0.1, cache_creation: 1 },
  },
  // === XAI247 (xai247.xyz) ===
  // Source: public GET https://xai247.xyz/api/models (no auth, verified 2026-10-13) —
  // the *PerMillionMicro fields divided by 1e6 = $/1M tokens. "plan" billingKind models
  // are drawn from a subscription plan on the site, but the per-token rates are still
  // what the catalog lists, so they're used for cost estimates here.
  // 2026-11-05: gpt-5.6-terra, gpt-6-luna, gpt-6.1-sol, claude-haiku-5-5, claude-sonnet-5-5 removed
  // (gone from the catalog; all 17 current models are billingKind "pack"). The 16 other current ids
  // have no rate here yet and fall back to the default estimate.
  xai247: {
    "claude-opus-5":    { input: 2.50, output: 12.50, cached: 0.25, cache_creation: 3.00 },
  },
  // === Kira AI (kiraai.vn) ===
  // [nqdev] Re-synced 2026-11-06 from the public https://kiraai.vn/api/v1/models (kira.js sets
  // modelsFetcher to it, so runtime ids come from there, not from the registry seed). All 91
  // chat models of that snapshot are listed; image/video/TTS models are excluded (no token pricing).
  // Rule: $/1M = price_*_vnd × (1 − discount_percent/100) ÷ 5,000 (Kira's internal ₫5,000 = $1).
  // Net of the CURRENT discount, which can expire (see promo_end_at in the catalog) — list prices
  // are higher once a promo ends. cached / cache_creation come from price_cache_read_vnd /
  // price_cache_write_vnd where > 0 (the catalog exposes them now); otherwise they fall back to input.
  // Free = is_free:true only (a discount badge or a "Free" tag is not the same guarantee).
  // time_pricing / active_time_window (time-of-day rates) are not modelled.
  // The catalog churns within days — re-sync rather than trusting this snapshot.
  kiraai: {
    "kira-3.5-pro": { input: 4.5, output: 30.6, cached: 0.72, cache_creation: 4.5 },
    "kira-3.5-flash": { input: 1.62, output: 9.9, cached: 0.36, cache_creation: 1.485 },
    "kira-3.5-flash-pdf": { input: 1.62, output: 9.9, cached: 0.36, cache_creation: 1.485 },
    "kira-2.5-pro": { input: 1.584, output: 4.5, cached: 0.216 },
    "kira-2.5-flash": { input: 0.232, output: 0.6, cached: 0.1008, cache_creation: 0.13 },
    "jev-1.14": { input: 1.5, output: 0 },
    "claude-haiku-5-5": { input: 0.416, output: 2.08, cached: 0.0832, cache_creation: 0.52 },
    "claude-sonnet-5-5": { input: 9.36, output: 46.8, cached: 1.872, cache_creation: 11.7 },
    "claude-opus-5-5": { input: 18.72, output: 93.6, cached: 3.744, cache_creation: 23.4 },
    "glm-5.3-flashx": { input: 1.7316, output: 5.85, cached: 0.3463, cache_creation: 2.1645 },
    "glm-5.3-flash": { input: 0.624, output: 2.08, cached: 0.1248, cache_creation: 0.78 },
    "glm-5.3": { input: 6.552, output: 20.592, cached: 1.3104, cache_creation: 8.19 },
    "glm-5.2": { input: 2.548, output: 8.008, cached: 0.5096, cache_creation: 3.185 },
    "glm-5.1": { input: 6.552, output: 20.592, cached: 1.3104, cache_creation: 8.19 },
    "glm-4.7-flash": { input: 0.092, output: 0.48, cached: 0.0002, cache_creation: 0.0012 },
    "glm-4.5-air": { input: 0.2028, output: 1.326, cached: 0.0406, cache_creation: 0.2535 },
    "deepseek-v4.1-flash-1017": { input: 1.4499, output: 5.7994, cached: 0.036 },
    "deepseek-v4.1-flash": { input: 1.1277, output: 4.5107, cached: 0.028, cache_creation: 0.6825 },
    "deepseek-v4-flash": { input: 1.248, output: 4.992, cached: 0.1248, cache_creation: 0.78 },
    "deepseek-v4-pro": { input: 5.4912, output: 16.4736, cached: 0.3432, cache_creation: 2.1445 },
    "minimax-m3.1-flash-coding": { input: 0.7722, output: 3.0888, cached: 0.0772 },
    "minimax-m3.1-flash": { input: 0.7722, output: 3.0888, cached: 0.0772 },
    "minimax-m3": { input: 1.248, output: 4.992, cached: 0.2496, cache_creation: 1.56 },
    "minimax-m2.7": { input: 0.546, output: 2.184, cached: 0.1092, cache_creation: 0.6825 },
    "mercury-3": { input: 0.416, output: 1.56, cached: 0.0416 },
    "mercury-2.5": { input: 0.416, output: 1.56, cached: 0.0832 },
    "mercury-2": { input: 0.336, output: 1.28, cached: 0.0336 },
    "kimi-k3.1-pro": { input: 9.36, output: 46.8, cached: 0.936, cache_creation: 9.36 },
    "kimi-k2.8-preview": { input: 4.68, output: 18.72, cached: 0.936, cache_creation: 5.85 },
    "kimi-k3": { input: 14.04, output: 70.2, cached: 1.404, cache_creation: 14.04 },
    "grok-4.7": { input: 9.36, output: 28.08, cached: 1.872, cache_creation: 11.7 },
    "grok-4.6": { input: 8.32, output: 24.96, cached: 1.664, cache_creation: 10.4 },
    "grok-4.5": { input: 8.32, output: 24.96, cached: 1.664, cache_creation: 10.4 },
    "qwen3.8-max": { input: 9.36, output: 28.08, cached: 1.872, cache_creation: 11.7 },
    "qwen3.8-27b": { input: 1.989, output: 11.934, cached: 0.3978, cache_creation: 2.4863 },
    "qwen3.8-flash": { input: 0.6656, output: 1.9552, cached: 0.1331, cache_creation: 0.832 },
    "qwen3.7-max": { input: 12.636, output: 37.674, cached: 2.5272, cache_creation: 15.795 },
    "qwen3.7-plus": { input: 1.53, output: 6.8, cached: 0.306, cache_creation: 1.9125 },
    "qwen3.6-27b": { input: 2.106, output: 12.636, cached: 0.4212, cache_creation: 2.6325 },
    "qwen3.6-flash": { input: 1.008, output: 3.96, cached: 0.1404, cache_creation: 0.8775 },
    "qwen3.5-flash-sale": { input: 0.56, output: 1, cached: 0.052, cache_creation: 0.325 },
    "coding-mimo-v2.6-flash": { input: 0.5824, output: 1.1648, cached: 0.0582, cache_creation: 0.5824 },
    "mimo-v2.6-flash": { input: 0.6552, output: 1.3104, cached: 0.131, cache_creation: 0.819 },
    "mimo-v2.6-pro": { input: 2.0358, output: 4.0716, cached: 0.4072, cache_creation: 2.5448 },
    "mimo-v2.5-pro": { input: 1.4251, output: 2.8501, cached: 0.2851, cache_creation: 1.7815 },
    "mimo-v2.5": { input: 0.6552, output: 1.3104, cached: 0.131, cache_creation: 0.819 },
    "gemini-4-argon": { input: 9.36, output: 46.8, cached: 0.468 },
    "gemini-3.8-flash": { input: 3.42, output: 17.64, cached: 0.342, cache_creation: 0.1962 },
    "gemini-3.5-flash-lite": { input: 1.44, output: 9, cached: 0.18, cache_creation: 0.54 },
    "gemini-2.5-flash-lite": { input: 0.378, output: 1.8, cached: 0.2178 },
    "gpt-6.1-terra": { input: 8.32, output: 41.6, cached: 0.832, cache_creation: 10.4 },
    "gpt-6-sol": { input: 9.36, output: 46.8, cached: 0.936, cache_creation: 11.7 },
    "gpt-6-luna": { input: 0.936, output: 5.616, cached: 0.1872, cache_creation: 1.17 },
    "gpt-6-astra": { input: 46.8, output: 234, cached: 9.36, cache_creation: 58.5 },
    "gpt-5.6-luna": { input: 0.936, output: 5.616, cached: 0.1872, cache_creation: 1.17 },
    "gpt-5.6-terra": { input: 9.36, output: 56.16, cached: 1.872, cache_creation: 11.7 },
    "gpt-5.6-sol": { input: 18.72, output: 93.6, cached: 3.744, cache_creation: 23.4 },
    "gpt-5.4-nano": { input: 0.468, output: 2.925, cached: 0.0936, cache_creation: 0.585 },
    "gpt-oss-120b": { input: 0.098, output: 0.2, cached: 0.004 },
    "hy4": { input: 3.9031, output: 11.7047, cached: 0.1951, cache_creation: 3.9031 },
    "hy3": { input: 0.6178, output: 2.471, cached: 0.1544, cache_creation: 0.6178 },
    "agnes-3.0-flash": { input: 0.104, output: 0.312, cached: 0.0104 },
    "agnes-2.5-flash": { input: 0.104, output: 0.312, cached: 0.0104 },
    "kira-flash": { input: 0.65, output: 1.95, cached: 0.065 },
    "kira-coding": { input: 1.4, output: 2.8, cached: 0.14 },
    "kira-chatbox": { input: 0.3, output: 0.72, cached: 0.03 },
    "kira-translate": { input: 0.28, output: 0.84, cached: 0.035 },
    "kira-content-safety": { input: 0.322, output: 0.84, cached: 0.0322 },
    "mistral-large-4-0": { input: 6.3648, output: 19.5624, cached: 1.273, cache_creation: 7.956 },
    "mistral-nemo": { input: 0.702, output: 0.702, cached: 0.1404, cache_creation: 0.8775 },
    "muse-wonder": { input: 18.72, output: 93.6, cached: 3.744, cache_creation: 23.4 },
    "muse-glimmer": { input: 0.2, output: 1, cached: 0.04, cache_creation: 0.2 },
    "minimax-m3.1-flash-sale": { input: 0.1716, output: 0.6864, cached: 0.0172 },
    "glm-5.3-flash-sale": { input: 0.156, output: 0.52, cached: 0.0392, cache_creation: 0.195 },
    "deepseek-v4.1-flash-sale": { input: 0.32, output: 1.28, cached: 0.01 },
    "nemotron-3.5-super-vl-sale": { input: 0.2, output: 4, cached: 0.02 },
    "step-5-preview-sale": { input: 0.52, output: 1.404, cached: 0.052 },
    "beam-sale": { input: 0.1, output: 0.26, cached: 0.01 },
    "kira-mini-1.0": { input: 0.09, output: 2.4, cached: 0.0092 },
    "apodex-1.1-mini-sale": { input: 0.09, output: 2.4, cached: 0.0092 },
    "gpt-oss-120b-sale": { input: 0.098, output: 0.2, cached: 0.004 },
    "gpt-oss-20b": { input: 0.078, output: 0.18, cached: 0.004 },
    "nemotron-3.5-lightning-sale": { input: 0.1, output: 2, cached: 0.01 },
    "nemotron-3.5-bolt-sale": { input: 0.08, output: 2, cached: 0.008 },
    "nemotron-3-ultra-sale": { input: 0.1, output: 2, cached: 0.01 },
    "qwen3.8-27b-sale": { input: 0.221, output: 1.326, cached: 0.0442, cache_creation: 0.2763 },
    "qwen3.8-flash-next-sale": { input: 0.0728, output: 0.1456, cached: 0.0146, cache_creation: 0.091 },
    "mimo-v2.6-flash-sale": { input: 0.0728, output: 0.144, cached: 0.0072 },
    "deepseek-v4-flash-sale": { input: 0.156, output: 0.624, cached: 0.0156, cache_creation: 0.0975 },
    "stealth/crouton-alpha": { input: 0, output: 0, cached: 0, cache_creation: 0 }, // is_free:true — listed 99% discounted price treated as $0
    "longcat-2.5-free": { input: 0, output: 0, cached: 0, cache_creation: 0 }, // is_free:true — listed 99% discounted price treated as $0
  },

  // === LLM7 (llm7.io) ===
  // Pulled live from https://api.llm7.io/v1/models — already $/1M USD, no conversion
  // needed. llm7.js sets modelsFetcher to this endpoint, so runtime model ids come from
  // here, not from the static seed list in packages/providers/registry/llm7.js (that
  // seed only has "default"/"codestral-latest"/"devstral-small-2:24b" — "default" and
  // "devstral-small-2:24b" aren't real billable ids in the live catalog, so they're
  // omitted here rather than guessed at).
  // The registry notice ("Free token: 1M tokens/day") is a free daily allowance —
  // usage beyond it bills at the real per-model rates below, so this is NOT priced at $0.
  // "cached" = cache-read rate; "cache_creation" = cache-write rate where the API
  // reports them separately (claude-fable-5, claude-opus-4-8, gpt-5.6-sol/terra).
  llm7: {
    "DeepSeek-V4-Flash-0731":         { input: 0.02, output: 0.04 },
    "Inkling":                        { input: 1.00, output: 4.05, cached: 0.17 },
    "Inkling-Small":                  { input: 0.50, output: 1.20, cached: 0.10 },
    "L3-8B-Lunaris-v1-Turbo":         { input: 0.04, output: 0.05 },
    "XiaomiMiMo/MiMo-V2.5":           { input: 0.40, output: 2.00, cached: 0.08 },
    "XiaomiMiMo/MiMo-V2.5-Pro":       { input: 1.00, output: 3.00, cached: 0.20 },
    "claude-fable-5":                 { input: 4.50, output: 30.00, cached: 0.40, cache_creation: 5.00 },
    "claude-haiku-4-5":               { input: 0.04, output: 0.20, cached: 0.08 },
    "claude-opus-4-8":                { input: 2.25, output: 12.19, cached: 0.03, cache_creation: 0.19 },
    "claude-opus-5":                  { input: 2.50, output: 12.50, cached: 0.03 },
    "claude-sonnet-4-6":              { input: 0.12, output: 0.45, cached: 0.40 },
    "claude-sonnet-5":                { input: 0.45, output: 2.25, cached: 0.25 },
    "codestral-latest":               { input: 0.01, output: 0.02 },
    "deepseek-v3":                    { input: 0.01, output: 0.02, cached: 0.01 },
    "deepseek-v4-flash:0731":         { input: 0.08, output: 0.16 },
    "gemini-3-flash":                 { input: 0.03, output: 0.08, cached: 0.01 },
    "gemini-3.1-flash-lite":          { input: 0.02, output: 0.04, cached: 0.02 },
    "gemini-3.5-flash-low":           { input: 0.04, output: 0.20 },
    "gemma4:31b":                     { input: 0.03, output: 0.08 },
    "gpt-5.4":                        { input: 0.15, output: 0.80, cached: 0.30 },
    "gpt-5.4-mini":                   { input: 0.04, output: 0.24, cached: 0.10 },
    "gpt-5.5":                        { input: 0.55, output: 3.30, cached: 0.55 },
    "gpt-5.6-sol":                    { input: 2.00, output: 6.00, cached: 0.04, cache_creation: 0.25 },
    "gpt-5.6-terra":                  { input: 0.50, output: 2.00, cached: 0.02, cache_creation: 0.13 },
    "gpt-oss:20b":                    { input: 0.04, output: 0.06 },
    "grok-4.5":                       { input: 0.30, output: 1.00, cached: 0.50 },
    "grok-4.6":                       { input: 0.40, output: 0.50, cached: 0.10 },
    "kimi-k2.6":                      { input: 0.05, output: 0.07 },
    "kimi-k2.7-code":                 { input: 0.09, output: 0.35, cached: 0.02 },
    "kimi-k3":                        { input: 1.70, output: 8.00, cached: 0.30 },
    "minimax-m2.7":                   { input: 0.03, output: 0.05 },
    "mistral-Nemo-Instruct-2407":     { input: 0.03, output: 0.03 },
    "mistral-Small-24B-Instruct-2501":{ input: 0.06, output: 0.08 },
    "seed-2.0-mini":                  { input: 0.10, output: 0.40, cached: 0.02 },
  },

  // === SambaNova Cloud (cloud.sambanova.ai) ===
  // Pulled live from https://api.sambanova.ai/v1/models (per-token USD, e.g. "prompt":
  // "0.00000300" → $3.00/1M). This is the full catalog — matches the 6 chat models in
  // packages/providers/registry/sambanova.js exactly, so no stale/missing ids here.
  // Real DeepSeek-V3.1/V3.2 rates ($3.00/$4.50) are notably higher than the generic
  // "deepseek-v*" canonical fallback ($0.14/$0.28) — SambaNova doesn't discount these.
  sambanova: {
    "DeepSeek-V3.1":               { input: 3.00, output: 4.50 },
    "DeepSeek-V3.2":               { input: 3.00, output: 4.50 },
    "Meta-Llama-3.3-70B-Instruct": { input: 0.60, output: 1.20 },
    "MiniMax-M2.7":                { input: 0.60, output: 2.40, cached: 0.06, cache_creation: 0 },
    "gemma-4-31B-it":              { input: 0.38, output: 1.15 },
    "gpt-oss-120b":                { input: 0.22, output: 0.59 },
  },

  // === Vilao AI (vilao.ai) — marketplace reselling known upstream models 1:1 ===
  // text-embedding-3-small omitted: embedding model, not covered by this token-cost schema.
  vilao: {
    "gpt-4o":                    { input: 2.50,  output: 10.00, cached: 1.25,   reasoning: 15.00, cache_creation: 2.50  },
    "gpt-4o-mini":                { input: 0.15,  output: 0.60,  cached: 0.075,  reasoning: 0.90,  cache_creation: 0.15  },
    "gpt-4.1":                    { input: 2.50,  output: 10.00, cached: 1.25,   reasoning: 15.00, cache_creation: 2.50  },
    // OpenAI o3, current published rate (was $10/$40 before an 80% price cut)
    "o3":                         { input: 2.00,  output: 8.00,  cached: 0.20,   reasoning: 8.00,  cache_creation: 2.00  },
    "claude-sonnet-4.6":          { input: 3.00,  output: 15.00, cached: 0.30,   reasoning: 15.00, cache_creation: 3.75  },
    "claude-opus-4.6":            { input: 5.00,  output: 25.00, cached: 0.50,   reasoning: 25.00, cache_creation: 6.25  },
    "claude-haiku-4.5":           { input: 1.00,  output: 5.00,  cached: 0.10,   reasoning: 5.00,  cache_creation: 1.25  },
    "gemini-2.5-pro":             { input: 2.00,  output: 12.00, cached: 0.25,   reasoning: 18.00, cache_creation: 2.00  },
  },

  // === Codely PixVerse (codelypixverse.com) ===
  // Image/video model ids omitted: not covered by this token-cost schema.
  codely: {
    "glm-5.2":                    { input: 1.00,  output: 4.00,  cached: 0.50,   reasoning: 6.00,  cache_creation: 1.00  },
    "kimi-k2.7-code":             { input: 0.95,  output: 4.00,  cached: 0.19,   reasoning: 4.00,  cache_creation: 0.95  },
    // No official published rate — estimated, mirrors canonical "auto" fallback tier
    "kiro-auto":                  { input: 2.00,  output: 8.00,  cached: 1.00,   reasoning: 12.00, cache_creation: 2.00  },
    "minimax-m3":                 { input: 0.30,  output: 1.20,  cached: 0.06,   reasoning: 1.80,  cache_creation: 0.30  },
  },

  // === ZenMux (zenmux.ai) — OpenAI-compatible passthrough, ids keep "vendor/model" prefix ===
  // Pulled live from https://zenmux.ai/api/v1/models. ZenMux is a router/reseller, not a
  // 1:1 passthrough — several rates are notably cheaper than the canonical upstream price
  // (e.g. openai/gpt-5.6-luna is $0.2/$1.2 here vs $1.00/$6.00 canonical; google/gemini-3.6-flash
  // is half the canonical rate), so these no longer mirror MODEL_PRICING/PATTERN_PRICING.
  // Several models are tiered by prompt size (e.g. gpt-5.6-* doubles past 272k context,
  // qwen3.7-flash has 3 tiers up to 256k+); the value here is the base/lowest tier — exact
  // for typical-length prompts, an underestimate for very long ones.
  zenmux: {
    "openai/gpt-5.6-luna":            { input: 0.20, output: 1.20,  cached: 0.02,   cache_creation: 0.25 },
    "openai/gpt-5.6-sol":             { input: 5.00, output: 30.00, cached: 0.50,   cache_creation: 6.25 },
    "openai/gpt-5.6-terra":           { input: 2.00, output: 12.00, cached: 0.20,   cache_creation: 2.50 },
    "anthropic/claude-opus-5":        { input: 5.00, output: 25.00, cached: 0.50,   cache_creation: 6.25 },
    "google/gemini-3.1-pro-preview":  { input: 2.00, output: 12.00, cached: 0.20,   cache_creation: 4.50 },
    "google/gemini-3.6-flash":        { input: 0.75, output: 3.75,  cached: 0.075 },
    "google/gemini-3.5-flash-lite":   { input: 0.30, output: 2.50,  cached: 0.03  },
    "qwen/qwen3.8-max":               { input: 1.40, output: 4.20,  cached: 0.119,  cache_creation: 1.75 },
    // Tiered: 0-32k shown; rises to $0.1/$0.4 (32-256k) then $0.2/$0.8 (256k+)
    "qwen/qwen3.7-flash":             { input: 0.03, output: 0.13 },
    "deepseek/deepseek-v4-flash":     { input: 0.22, output: 0.66,  cached: 0.007 },
    "moonshotai/kimi-k3":             { input: 2.70, output: 13.50, cached: 0.27  },
    "x-ai/grok-4.5":                  { input: 2.00, output: 6.00,  cached: 0.50  },
    // prompt + completion = $0 in /api/v1/models (2026-11-05)
    "z-ai/glm-4.6v-flash-free":       { input: 0,    output: 0     },
    "z-ai/glm-4.7-flash-free":        { input: 0,    output: 0     },
    "atria-asi/atria-dawn":           { input: 0,    output: 0     },
    "dots-studio/dots3-note-prev":    { input: 0,    output: 0     },
    "sapiens-ai/agnes-2.5-flash":     { input: 0,    output: 0     },
  },

  // === OpenCode Zen (opencode.ai/zen) — pay-as-you-go, zero markup ===
  // Pulled from https://opencode.ai/docs/zen/#pricing. Rates there use dotted ids
  // (e.g. "claude-opus-4.8") but the live modelsFetcher (https://opencode.ai/zen/v1/models,
  // same ids as packages/providers/registry/opencode-zen.js) returns dashed ids
  // ("claude-opus-4-8") — keys below use the live/runtime (dashed) form.
  // Several models are tiered by prompt size or peak/off-peak hours (deepseek-v4-*,
  // claude-sonnet-4-5, gemini-3.1-pro, grok-4.5/4.6, gpt-5.1/5.2/5.4/5.5/5.6 family) —
  // the value here is the base/lowest tier, matching the zenmux convention above.
  // "claude-sonnet-4" has no published rate on the pricing page — estimated here as the
  // same tier as claude-sonnet-4-6/4-5 (nearest same-family sibling).
  // gpt-5.5-pro / gpt-5.4-pro list a "cached" rate equal to their input rate (no discount)
  // — kept as published, not a typo.
  "opencode-zen": {
    "claude-fable-5":                 { input: 10.00, output: 50.00,  cached: 1.00,  cache_creation: 12.50 },
    "claude-opus-5":                  { input: 5.00,  output: 25.00,  cached: 0.50,  cache_creation: 6.25  },
    "claude-opus-4-8":                { input: 5.00,  output: 25.00,  cached: 0.50,  cache_creation: 6.25  },
    "claude-opus-4-7":                { input: 5.00,  output: 25.00,  cached: 0.50,  cache_creation: 6.25  },
    "claude-opus-4-6":                { input: 5.00,  output: 25.00,  cached: 0.50,  cache_creation: 6.25  },
    "claude-opus-4-5":                { input: 5.00,  output: 25.00,  cached: 0.50,  cache_creation: 6.25  },
    "claude-sonnet-5":                { input: 2.00,  output: 10.00,  cached: 0.20,  cache_creation: 2.50  },
    "claude-sonnet-4-6":              { input: 3.00,  output: 15.00,  cached: 0.30,  cache_creation: 3.75  },
    "claude-sonnet-4-5":              { input: 3.00,  output: 15.00,  cached: 0.30,  cache_creation: 3.75  },
    // estimated — see file header note
    "claude-sonnet-4":                { input: 3.00,  output: 15.00,  cached: 0.30,  cache_creation: 3.75  },
    "claude-haiku-4-5":               { input: 1.00,  output: 5.00,   cached: 0.10,  cache_creation: 1.25  },
    "gemini-3.7-flash":               { input: 1.50,  output: 7.50,   cached: 0.15  },
    "gemini-3.6-flash":               { input: 1.50,  output: 7.50,   cached: 0.15  },
    "gemini-3.5-flash":               { input: 1.50,  output: 9.00,   cached: 0.15  },
    "gemini-3.5-flash-lite":          { input: 0.30,  output: 2.50,   cached: 0.03  },
    "gemini-3.1-pro":                 { input: 2.00,  output: 12.00,  cached: 0.20  },
    "gemini-3-flash":                 { input: 0.50,  output: 3.00,   cached: 0.05  },
    "gpt-5.6-sol":                    { input: 2.00,  output: 10.00,  cached: 0.20  },
    "gpt-5.6-terra":                  { input: 2.00,  output: 12.00,  cached: 0.20  },
    "gpt-5.6-luna":                   { input: 0.20,  output: 1.20,   cached: 0.02  },
    "gpt-5.5":                        { input: 5.00,  output: 30.00,  cached: 0.50  },
    "gpt-5.5-pro":                    { input: 30.00, output: 180.00, cached: 30.00 },
    "gpt-5.4":                        { input: 2.50,  output: 15.00,  cached: 0.25  },
    "gpt-5.4-pro":                    { input: 30.00, output: 180.00, cached: 30.00 },
    "gpt-5.4-mini":                   { input: 0.75,  output: 4.50,   cached: 0.075 },
    "gpt-5.4-nano":                   { input: 0.20,  output: 1.25,   cached: 0.02  },
    "gpt-5.3-codex-spark":            { input: 1.75,  output: 14.00,  cached: 0.175 },
    "gpt-5.3-codex":                  { input: 1.75,  output: 14.00,  cached: 0.175 },
    "gpt-5.2":                        { input: 1.75,  output: 14.00,  cached: 0.175 },
    "gpt-5.2-codex":                  { input: 1.75,  output: 14.00,  cached: 0.175 },
    "gpt-5.1":                        { input: 1.07,  output: 8.50,   cached: 0.107 },
    "gpt-5.1-codex-max":              { input: 1.25,  output: 10.00,  cached: 0.125 },
    "gpt-5.1-codex":                  { input: 1.07,  output: 8.50,   cached: 0.107 },
    "gpt-5.1-codex-mini":             { input: 0.25,  output: 2.00,   cached: 0.025 },
    "gpt-5":                          { input: 1.07,  output: 8.50,   cached: 0.107 },
    "gpt-5-codex":                    { input: 1.07,  output: 8.50,   cached: 0.107 },
    "gpt-5-nano":                     { input: 0.05,  output: 0.40,   cached: 0.005 },
    "grok-build-0.1":                 { input: 1.00,  output: 2.00,   cached: 0.20  },
    "grok-4.6":                       { input: 2.00,  output: 6.00,   cached: 0.50  },
    "grok-4.5":                       { input: 2.00,  output: 6.00,   cached: 0.30  },
    "muse-spark-1.2":                 { input: 1.25,  output: 4.25,   cached: 0.15  },
    // Off-peak base rate; doubles during peak hours per pricing page
    "deepseek-v4-pro":                { input: 0.66,  output: 1.98,   cached: 0.022 },
    "deepseek-v4-flash":              { input: 0.22,  output: 0.66,   cached: 0.007 },
    "glm-5.2":                        { input: 1.40,  output: 4.40,   cached: 0.26  },
    "glm-5.1":                        { input: 1.40,  output: 4.40,   cached: 0.26  },
    "glm-5":                          { input: 1.00,  output: 3.20,   cached: 0.20  },
    "minimax-m3":                     { input: 0.30,  output: 1.20,   cached: 0.06  },
    "minimax-m2.7":                   { input: 0.30,  output: 1.20,   cached: 0.06  },
    "minimax-m2.5":                   { input: 0.30,  output: 1.20,   cached: 0.06  },
    "kimi-k3":                        { input: 3.00,  output: 15.00,  cached: 0.30  },
    "kimi-k2.7-code":                 { input: 0.95,  output: 4.00,   cached: 0.19  },
    "kimi-k2.6":                      { input: 0.95,  output: 4.00,   cached: 0.16  },
    "kimi-k2.5":                      { input: 0.60,  output: 3.00,   cached: 0.10  },
    "qwen3.6-plus":                   { input: 0.50,  output: 3.00,   cached: 0.05,  cache_creation: 0.625 },
    "qwen3.5-plus":                   { input: 0.20,  output: 1.20,   cached: 0.02,  cache_creation: 0.25  },
    // Free tier: cost.text input/output price = 0 in the live catalog (2026-11-05), limited-time
    "big-pickle":                     { input: 0,     output: 0     },
    "beam-free":                      { input: 0,     output: 0     },
    "flint-40b-free":                 { input: 0,     output: 0     },
    "mimo-v2.6-flash-free":           { input: 0,     output: 0     },
    "nemotron-3.5-super-vl-free":     { input: 0,     output: 0     },
    "nemotron-3.5-lightning-free":    { input: 0,     output: 0     },
    "deepseek-v4.1-flash-free":       { input: 0,     output: 0     },
    "glm-5.3-flash-free":             { input: 0,     output: 0     },
    "pulse-alpha-free":               { input: 0,     output: 0     },
    "crouton-alpha-free":             { input: 0,     output: 0     },
  },

  // === AI/ML API (aimlapi.com) ===
  // Pulled from each model's page on https://aimlapi.com/models/ — the 4 chat models
  // seeded in packages/providers/registry/aimlapi.js are listed at $0/1M tokens. 2026-11-05:
  // mistral/leanstral-1-5 and stealth/ox-alpha dropped (gone from /v1/models). The catalog itself
  // has no price field, so $0 here still rests on those model pages.
  aimlapi: {
    "google/gemma-3-27b-it":     { input: 0, output: 0 },
    "inclusionai/ling-3.0-tiny": { input: 0, output: 0 },
  },

  // === GuRouter (gurouter.gulagi.com) — self-hosted "New API" gateway ===
  // Pulled live from the public, unauthenticated https://gurouter.gulagi.com/api/pricing
  // feed (checked 2026-08-28) — this is the entire catalog today, all 3 models at $0
  // (model_ratio/model_price both 0 for every entry). Re-check that feed once the vendor
  // list there (OpenAI/Anthropic/DeepSeek, currently unused) starts backing priced models.
  gurouter: {
    "poolside/laguna-s-2.1-free": { input: 0, output: 0 },
    "minimax/minimax-m3-free":    { input: 0, output: 0 },
    "minimax/minimax-m2.7-free":  { input: 0, output: 0 },
  },

  // === HHTechAPI (hhtechapi.com / hhtechapi.net) ===
  // Pulled live from the public, unauthenticated https://hhtechapi.com/portal/api/public/models
  // feed (verified live, 2026-09-03 — 200 with no Authorization header). Rates there are
  // VND-denominated "credit" per 1M tokens (site states "1.000đ = 1.000 credit", i.e.
  // 1 credit = 1 VND); several families expose a `detailedPrice` split
  // (input/output/cacheRead/cacheWrite/blended), others only a blended `priceText`.
  // USD conversion below uses a plain external market rate (~26,000 VND/$1) since — unlike
  // Kira — HHTechAPI's feed has no matching "0% discount" reference model to back into an
  // exact internal rate from; this is an approximation, re-verify against the live feed and
  // current VND/USD rate periodically, not a rate HHTechAPI itself publishes.
  // Sanity check: comparing these ids against open-sse/providers/pricing.js's own canonical
  // rates for the same ids (gpt-5.6-luna $1.00/$6.00, -terra $2.50/$15.00, -sol $5.00/$30.00,
  // claude-fable-5 $10.00/$50.00) shows HHTechAPI priced at roughly 3-30x below list — the
  // families are tagged provider:"kiro"/"codex" in the feed, consistent with resold
  // subscription/credential access rather than metered upstream billing, so the gap is
  // expected, not a data error.
  // `cacheRead`→`cached`, `cacheWrite`→`cache_creation` to match this schema's field names.
  // Blended-only entries (no detailedPrice split published) use the single blended rate for
  // both input and output, flagged inline.
  // Excluded: image models (gpt-image-2, grok-imagine-image*, gemini-*-image) — billed per
  // request, not per token, outside this $/1M schema. "deepseek-v4" ("Deepseek V4 Tặng") is
  // excluded too — priceText says "Dùng lượt request tặng" (spent from a free/gifted request
  // quota, not credit-metered).
  hhtechapi: {
    "claude-fable-5-1": { input: 0.1538, output: 0.1538 }, // blended-only (4.000 credit/1M)
    "claude-fable-5":   { input: 0.3077, output: 1.5385, cached: 0.0615, cache_creation: 0.3846 },
    "claude-opus-5":    { input: 0.1538, output: 0.7692, cached: 0.0308, cache_creation: 0.1923 },
    "claude-opus-4-8":  { input: 0.1538, output: 0.7692, cached: 0.0308, cache_creation: 0.1923 },
    "claude-opus-4-7":  { input: 0.1538, output: 0.7692, cached: 0.0308, cache_creation: 0.1923 },
    "claude-opus-4-6":  { input: 0.1538, output: 0.7692, cached: 0.0308, cache_creation: 0.1923 },
    "claude-sonnet-5":  { input: 0.0923, output: 0.4615, cached: 0.0185, cache_creation: 0.1154 },
    "claude-sonnet-4.6":{ input: 0.0923, output: 0.4615, cached: 0.0185, cache_creation: 0.1154 },
    "claude-sonnet-4.5":{ input: 0.0308, output: 0.1538, cached: 0.0062, cache_creation: 0.0385 },
    "claude-haiku-4.5": { input: 0.0308, output: 0.1538, cached: 0.0062, cache_creation: 0.0385 },
    "gpt-5.6-sol":      { input: 0.0615, output: 0.3077, cached: 0.0415 },
    "gpt-5.6-terra":    { input: 0.0423, output: 0.2115, cached: 0.0327 },
    "gpt-5.6-luna":     { input: 0.0346, output: 0.1731, cached: 0.0250 },
    "gpt-5.5":          { input: 0.0346, output: 0.1731, cached: 0.0250 },
    "gpt-5.4":          { input: 0.0346, output: 0.1731, cached: 0.0269 },
    // blended-only families below (no detailedPrice split in the feed) — same rate for input/output
    "gpt-5.3-codex-spark": { input: 0.0231, output: 0.0231 },
    "grok-4.6":            { input: 0.0346, output: 0.0346 },
    "grok-4.5":            { input: 0.0308, output: 0.0308 },
    "deepseek-v4-pro":     { input: 0.0231, output: 0.0231 },
    "deepseek-v4-flash":   { input: 0.0135, output: 0.0135 },
    "glm-5.2":             { input: 0.0269, output: 0.0269 },
    "kimi-k3":             { input: 0.0385, output: 0.0385 },
    "glm-5.3-flash":       { input: 0.0327, output: 0.0327 },
    "gemini-3.1-pro":      { input: 0.0308, output: 0.0308 },
    "gemini-3.7-flash":    { input: 0.0250, output: 0.0250 },
    "gemini-3.6-flash":    { input: 0.0192, output: 0.0192 },
    "qwen3-coder-plus":    { input: 0.0154, output: 0.0154 },
  },
};
