// Extra suggested-models filters for custom providers registered in
// packages/providers/registry/ (i.e. providers that don't come from the upstream
// open-sse merge — see AGENTS.md "Provider system").
//
// Merged into FILTERS in src/app/api/providers/suggested-models/filters.js — that
// route resolves a provider's `modelsFetcher.type` to one of these functions to turn
// a raw /v1/models response into the { id, name, contextLength? } shape the
// "Available Models" UI renders. Same merge pattern as this package's pricing.js
// (EXTRA_PROVIDER_PRICING merged into open-sse/providers/pricing.js).
export const FILTERS = {
  // Generic OpenAI-compatible /v1/models catalog — used by providers whose registry
  // entry sets `modelsFetcher.type: "openai"` (kira, aimlapi here; also reused by a
  // few upstream open-sse providers — perplexity-agent, tokenrouter,
  // vercel-ai-gateway, venice — since the shape is the same). Unlike the "-free"
  // filters in the base FILTERS object, this doesn't restrict to zero-cost/large-
  // context models — it's meant to surface the provider's FULL live catalog (paired
  // with passthroughModels: true) so users can pick any id, not just a curated free
  // subset. Excludes non-chat entries (image/video/audio) when the API tags a `type`
  // field (Kira's catalog does); providers whose /v1/models has no `type` field at
  // all (the plain vanilla OpenAI shape) keep every entry, since there's nothing to
  // distinguish there.
  //
  // This key was previously missing entirely from the base FILTERS object — every
  // "openai"-type provider's suggested-models fetch 400'd with "Unknown filter type"
  // and silently rendered an empty "Available Models" list (fetchSuggestedModels
  // swallows non-ok responses), which is what broke it for Kira.
  openai: (models) =>
    (Array.isArray(models) ? models : [])
      .filter((m) => !m.type || m.type === "chat" || m.type === "text")
      .map((m) => ({ id: m.id, name: m.name || m.id, contextLength: m.context_length }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),

  // [nqdev] BeatAPI public catalog (GET https://api.beatapi.io/v1/text/models, no key needed).
  // Shape is double-wrapped: { data: { object: "list", data: [...] } }. The suggested-models route
  // does `json.data ?? ...` and then wraps a non-array object into a single-element array, so this
  // filter receives either the inner array or [ { object, data: [...] } ] — unwrap both.
  // Only keeps entries that expose the OpenAI chat endpoint ("endpoints" includes "openai"):
  // Claude-only ("anthropic") ids can't be served through the chat/completions baseUrl.
  // Free ids ("-free") carry no context_length, so contextLength may be undefined.
  beatapi: (models) => {
    const list = Array.isArray(models) ? models : [];
    const items = list.length === 1 && Array.isArray(list[0]?.data) ? list[0].data : list;
    return items
      .filter((m) => m && m.id && (!Array.isArray(m.endpoints) || m.endpoints.includes("openai")))
      .map((m) => ({ id: m.id, name: m.name || m.id, contextLength: m.context_length }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  },
};
