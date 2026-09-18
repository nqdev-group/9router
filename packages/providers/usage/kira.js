// Kira AI usage/quota — GET https://kiraai.vn/api/v1/user/profile
// Auth: Bearer <apiKey>
//
// Verified live (2026-09-18) against a real account — success shape:
//   { success: true, user: { ..., balances: {
//     vnd_balance, token_balance, daily_token_limit, free_daily_limit,
//     tokens_used_today, vnd_spent_today, token_expires_at
//   } } }
// (401 "no_token_provided" with no Authorization header, 403
// "invalid_or_expired_token" with a bad one — same endpoint already used to
// validate connections, see packages/providers/test/testUtils.js.)
//
// Three numbers worth surfacing:
//   - tokens_used_today / (daily_token_limit ?? free_daily_limit): a real daily
//     quota that resets — shown as a normal used/total bar. daily_token_limit is
//     null on a plain personal account (this test account) and presumably set on
//     paid/Dev plans; free_daily_limit (195,000,000 on this account) is the
//     fallback everyone gets. No reset timestamp is returned, so resetAt is left
//     null (renders "N/A") rather than guessing a timezone.
//   - token_balance: a separate declining pool (30,000 on this account, no paired
//     "total" field in the response — not the same number as the free/paid plan's
//     monthly token allowance mentioned in this provider's own notice text) —
//     shown as a non-resetting credit pot, same "unlimited while positive" style
//     DeepSeek's balance uses (open-sse/services/usage/deepseek.js).
//   - vnd_balance: pay-as-you-go wallet balance — same credit-pot treatment.
// vnd_spent_today / token_expires_at are not surfaced — redundant with the above
// (spent-today is implied by the daily-used row) or null on every account seen so far.

import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";
import { toFiniteNumber } from "open-sse/services/usage/shared.js";

const PROFILE_URL = "https://kiraai.vn/api/v1/user/profile";

export async function getKiraUsage(apiKey = null, proxyOptions = null) {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return { message: "Kira AI API key not available. Add a key to view usage." };
  }

  try {
    const response = await proxyAwareFetch(
      PROFILE_URL,
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
      return { plan: "Kira AI", message: "Kira AI authentication failed. Check the API key." };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        plan: "Kira AI",
        message: `Kira AI profile API error (${response.status})${errText ? `: ${errText.slice(0, 120)}` : ""}`,
      };
    }

    const data = await response.json().catch(() => null);
    const balances = data?.user?.balances;
    if (!balances || typeof balances !== "object") {
      return { message: "Kira AI profile response was missing user.balances." };
    }

    const quotas = {};

    const dailyLimit = toFiniteNumber(balances.daily_token_limit ?? balances.free_daily_limit, null);
    const usedToday = toFiniteNumber(balances.tokens_used_today, null);
    if (dailyLimit !== null && dailyLimit > 0 && usedToday !== null) {
      quotas["Tokens used today"] = {
        used: usedToday,
        total: dailyLimit,
        resetAt: null,
      };
    }

    const tokenBalance = toFiniteNumber(balances.token_balance, null);
    if (tokenBalance !== null) {
      quotas["Token balance"] = {
        used: 0,
        total: Math.max(0, tokenBalance),
        remainingPercentage: tokenBalance > 0 ? 100 : 0,
        resetAt: null,
        unlimited: tokenBalance > 0,
      };
    }

    const vndBalance = toFiniteNumber(balances.vnd_balance, null);
    if (vndBalance !== null) {
      quotas["Wallet balance (VND)"] = {
        used: 0,
        total: Math.max(0, Math.round(vndBalance)),
        remainingPercentage: vndBalance > 0 ? 100 : 0,
        resetAt: null,
        unlimited: vndBalance > 0,
      };
    }

    if (Object.keys(quotas).length === 0) {
      return { plan: "Kira AI", message: "Kira AI connected. No balance data returned." };
    }

    return { plan: "Kira AI", quotas };
  } catch (error) {
    return { message: `Kira AI error: ${error.message}` };
  }
}
