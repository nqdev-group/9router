// Extra API-key connection testers for custom providers registered in
// packages/providers/registry/ (i.e. providers that don't come from the upstream
// open-sse merge — see AGENTS.md "Provider system").
//
// Merged into testApiKeyConnection() in
// src/app/api/providers/[id]/test/testUtils.js — checked before that file's own
// switch, keyed by `connection.provider`. Each tester receives
// (connection, effectiveProxy, fetchWithConnectionProxy) — the same
// proxy-aware fetch wrapper the base switch uses — and returns { valid, error }.
// Same merge pattern as this package's pricing.js (EXTRA_PROVIDER_PRICING) and
// suggested-models/filters.js (EXTRA_FILTERS).
//
// A provider with no entry here (and no case in the base switch) falls through to
// "Provider test not supported" — this was Kira's exact symptom before it got an
// entry below (2026-09-18): every custom provider in packages/providers/registry/
// starts out untested this way, since the base switch only covers providers that
// existed when it was written.
export const TESTERS = {
  async kira(connection, effectiveProxy, fetchWithConnectionProxy) {
    // NOT /api/v1/models — verified live that it returns 200 even with a garbage
    // Bearer token (it's a public endpoint), so it can't distinguish a valid key.
    // /api/v1/user/profile does require auth (verified live: 401 "no_token_provided"
    // with no header, 403 "invalid_or_expired_token" with a bad one) and is a cheap
    // read — no chat/image/video quota consumed just to test the connection.
    const res = await fetchWithConnectionProxy("https://kiraai.vn/api/v1/user/profile", {
      headers: { Authorization: `Bearer ${connection.apiKey}` },
    }, effectiveProxy);
    return { valid: res.ok, error: res.ok ? null : "Invalid API key" };
  },
};
