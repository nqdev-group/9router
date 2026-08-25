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
  // === Kira AI (kiraai.vn) ===
  // Pulled live from https://kiraai.vn/api/v1/models (kira.js sets modelsFetcher to this
  // endpoint, so runtime model ids come from here, not from the static seed list in
  // packages/providers/registry/kira.js — that seed list is stale, e.g. it has "kira-2.0"
  // which doesn't exist live; the real id is "kira-mini-2.0").
  // Kira quotes VND at an internal ₫5,000 = $1.00 token-credit rate — verified exact
  // against gpt-5.6-luna: their ₫5,000/₫30,000 = canonical $1.00/$6.00 with zero markup.
  // "(N% discount)" badges are applied here (100% discount = $0; 40% discount = 60% of
  // the listed price, e.g. kimi-k3). cached/reasoning/cache_creation are intentionally
  // omitted — Kira's API exposes only input/output, and calculateCostFromTokens() already
  // falls back to input/output rates when those fields are absent.
  kira: {
    "kira-3.5-pro":               { input: 5.00,   output: 34.00  },
    "kira-3.5-flash":             { input: 1.80,   output: 11.00  },
    "kira-2.5-pro":               { input: 1.30,   output: 9.00   },
    "kira-2.5-flash":             { input: 1.16,   output: 3.00   },
    "kira-mini-2.0":              { input: 0.3104, output: 0.9464 },
    // "(Free)" badge in live API despite a listed ₫1,000/₫5,000 rate — treated as $0
    "kira-mini-1.0":              { input: 0,      output: 0      },
    "deepseek-v4-pro":            { input: 3.36,   output: 10.10  },
    "deepseek-v4-flash":          { input: 1.12,   output: 3.36   },
    "deepseek-v4-flash-0731":     { input: 1.12,   output: 3.36   },
    "deepseek-v4-pro-free":       { input: 0,      output: 0      },
    "deepseek-v4-flash-free":     { input: 0,      output: 0      },
    "deepseek-v4-pro-1b-free":    { input: 0,      output: 0      },
    "deepseek-v4-flash-1b-free":  { input: 0,      output: 0      },
    "claude-fable-5":             { input: 50.00,  output: 260.00 },
    "claude-sonnet-5":            { input: 10.00,  output: 52.00  },
    "claude-opus-4.8":            { input: 24.00,  output: 124.00 },
    "claude-opus-5":              { input: 24.00,  output: 124.00 },
    "claude-opus-5-fast":         { input: 50.00,  output: 250.00 },
    "claude-opus-5-sale":         { input: 0,      output: 0      },
    "claude-opus-4.8-sale":       { input: 0,      output: 0      },
    "qwen-3.8-max-free":          { input: 0,      output: 0      },
    "qwen-3.8-27b-free":          { input: 0,      output: 0      },
    "qwen-3.8-max":               { input: 10.00,  output: 30.00  },
    "qwen-3.6-flash":             { input: 1.12,   output: 4.40   },
    "qwen-3.5-flash":             { input: 1.12,   output: 2.00   },
    "qwen-3.5-omni-plus":         { input: 4.40,   output: 28.00  },
    "qwen-3.7-plus":              { input: 1.80,   output: 8.00   },
    "qwen-3.7-max":               { input: 6.20,   output: 18.00  },
    "gemini-3.7-flash":           { input: 3.80,   output: 19.60  },
    "gemini-3.6-flash":           { input: 7.00,   output: 40.00  },
    "gemini-3.5-flash":           { input: 7.00,   output: 40.00  },
    "gemini-3.5-flash-lite":      { input: 1.60,   output: 10.00  },
    "mimo-v2.5":                  { input: 1.80,   output: 9.00   },
    "mimo-v2.5-pro":              { input: 4.40,   output: 13.80  },
    // 40% discount already applied (listed ₫75,000/₫380,000 × 0.6)
    "kimi-k3":                    { input: 9.00,   output: 45.60  },
    "glm-5.2":                    { input: 6.00,   output: 20.00  },
    "grok-4.5":                   { input: 10.00,  output: 30.00  },
    "minimax-m3":                 { input: 1.40,   output: 5.40   },
    "gpt-5.6-luna":               { input: 1.00,   output: 6.00   },
    "gpt-5.6-terra":              { input: 12.60,  output: 76.00  },
    "gpt-5.4":                    { input: 13.00,  output: 78.00  },
    "gpt-5.6-sol":                { input: 25.20,  output: 151.20 },
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
    "deepseek/deepseek-v4-flash-free":{ input: 0,    output: 0     },
    "moonshotai/kimi-k3":             { input: 2.70, output: 13.50, cached: 0.27  },
    "x-ai/grok-4.5":                  { input: 2.00, output: 6.00,  cached: 0.50  },
    "z-ai/glm-4.6v-flash-free":       { input: 0,    output: 0     },
    "z-ai/glm-4.7-flash-free":        { input: 0,    output: 0     },
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
    // "-free" ids: limited-time free tier, $0 per opencode-zen.js registry notes
    "big-pickle":                     { input: 0,     output: 0     },
    "deepseek-v4-flash-free":         { input: 0,     output: 0     },
    "x-preview-f-free":               { input: 0,     output: 0     },
    "muse-spark-1.2-contributor-free":{ input: 0,     output: 0     },
    "mimo-v2.5-free":                 { input: 0,     output: 0     },
    "hy3-free":                       { input: 0,     output: 0     },
    "nemotron-3-ultra-free":          { input: 0,     output: 0     },
    "nemotron-3.5-lightning-free":    { input: 0,     output: 0     },
    "laguna-s-2.1-free":              { input: 0,     output: 0     },
  },
};
