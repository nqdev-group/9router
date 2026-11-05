// BeatAPI usage/balance — GET https://api.beatapi.io/v1/usage
// Auth: Bearer <apiKey> (an API key or a personal access token both return the same
// account-wide summary — see https://docs.beatapi.io/quick-guide, "Check usage and limits").
//
// NOTE: response shape below comes from that documentation page (checked 2026-11-05), NOT from a
// live call with a real key (none was available when this was written). Field used:
//   credit_balance  number — current USD balance, may be negative; always current
// 401 -> { error: { code: "missing_api_key" | "invalid_api_key", ... } }.
//
// Surfaced as a non-resetting credit pot ("unlimited while positive", same style as Kira's
// wallet balance — see ./kira.js). BeatAPI has no daily token quota for text, so there is no
// used/total bar. Free "-free" models work with a zero balance, so a 0 balance is not an error.
// credits_settled / concurrency / by_* breakdowns are not surfaced (task-oriented, mostly
// image/video; no meaningful "total" to draw a bar against).

import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";
import { toFiniteNumber } from "open-sse/services/usage/shared.js";

const USAGE_URL = "https://api.beatapi.io/v1/usage";

export async function getBeatApiUsage(apiKey = null, proxyOptions = null) {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return { message: "BeatAPI API key not available. Add a key to view usage." };
  }

  try {
    const response = await proxyAwareFetch(
      USAGE_URL,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: "application/json",
        },
      },
      proxyOptions,
    );

    if (response.status === 401 || response.status === 403) {
      return { plan: "BeatAPI", message: "BeatAPI authentication failed. Check the API key." };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        plan: "BeatAPI",
        message: `BeatAPI usage API error (${response.status})${errText ? `: ${errText.slice(0, 120)}` : ""}`,
      };
    }

    const data = await response.json().catch(() => null);
    const balance = toFiniteNumber(data?.credit_balance, null);
    if (balance === null) {
      return { plan: "BeatAPI", message: "BeatAPI usage response was missing credit_balance." };
    }

    return {
      plan: "BeatAPI",
      quotas: {
        "Credit balance (USD)": {
          used: 0,
          total: Math.max(0, balance),
          remainingPercentage: balance > 0 ? 100 : 0,
          resetAt: null,
          unlimited: balance > 0,
        },
      },
    };
  } catch (error) {
    return { message: `BeatAPI error: ${error.message}` };
  }
}
