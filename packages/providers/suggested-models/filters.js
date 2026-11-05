// Extra suggested-models filters for custom providers in packages/providers/registry/
// (not part of the upstream open-sse merge — see AGENTS.md "Provider system").
//
// Merged into FILTERS in src/app/api/providers/suggested-models/filters.js. The route maps a
// provider's `modelsFetcher.type` to one of these functions, turning a raw /v1/models response
// into the { id, name, contextLength? } shape the "Available Models" UI renders.
export const FILTERS = {
  // Generic OpenAI-compatible /v1/models catalog (`modelsFetcher.type: "openai"`: kira, aimlapi,
  // and a few upstream providers). Surfaces the FULL live catalog (pair with passthroughModels),
  // not just free/large-context models. Drops non-chat entries only when the API tags a `type`
  // field (Kira does); catalogs without `type` keep every entry.
  // Was missing from the base FILTERS: the route 400'd "Unknown filter type" and the UI silently
  // showed an empty list (this is what broke Kira).
  openai: (models) =>
    (Array.isArray(models) ? models : [])
      .filter((m) => !m.type || m.type === "chat" || m.type === "text")
      .map((m) => ({ id: m.id, name: m.name || m.id, contextLength: m.context_length }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),

  // [nqdev] BeatAPI public catalog (GET https://api.beatapi.io/v1/text/models, no key).
  // Double-wrapped { data: { object, data: [...] } }; the route wraps that object in a 1-element
  // array, so unwrap both that and an already-flat array. Keeps only entries whose `endpoints`
  // include "openai" (anthropic-only ids can't go through chat/completions). Free ids have no
  // context_length, so contextLength may be undefined.
  beatapi: (models) => {
    const list = Array.isArray(models) ? models : [];
    const items = list.length === 1 && Array.isArray(list[0]?.data) ? list[0].data : list;
    return items
      .filter((m) => m && m.id && (!Array.isArray(m.endpoints) || m.endpoints.includes("openai")))
      .map((m) => ({ id: m.id, name: m.name || m.id, contextLength: m.context_length }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  },
};
