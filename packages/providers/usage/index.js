// Extra usage/quota handlers for custom providers registered in
// packages/providers/registry/ (i.e. providers that don't come from the upstream
// open-sse merge — see AGENTS.md "Provider system").
//
// Merged into USAGE_HANDLERS in open-sse/services/usage.js — same ctx-object calling
// convention as that file's own handlers (provider, accessToken, apiKey,
// providerSpecificData, proxyOptions, force). Same merge pattern as this package's
// pricing.js (EXTRA_PROVIDER_PRICING), suggested-models/filters.js (EXTRA_FILTERS),
// and test/testUtils.js (TESTERS).
import { getKiraUsage } from "./kira.js";

export const USAGE_HANDLERS = {
  kira: (c) => getKiraUsage(c.apiKey, c.proxyOptions),
};
