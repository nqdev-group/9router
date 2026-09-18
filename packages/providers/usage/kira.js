// Kira AI usage/quota — GET https://kiraai.vn/api/v1/user/profile
// Auth: Bearer <apiKey>
//
// Endpoint choice verified live (2026-09-18): GET /api/v1/user/profile returns 401
// "no_token_provided" with no Authorization header and 403 "invalid_or_expired_token"
// with a bad one (same endpoint already used to validate connections — see
// packages/providers/test/testUtils.js) — so it's the right auth-gated place to pull
// balance/usage from. The exact SUCCESS response shape is NOT verified (no live API
// key was available while writing this) — field names below are a best-effort guess
// from the labels shown on https://kiraai.vn/developer/: "Tokens model Kira còn lại"
// (remaining Kira-model token balance), "Đã dùng hôm nay" (used today), "Số dư ví
// còn lại" (remaining VND wallet balance). If the Quota page shows "no recognized
// usage fields" or clearly wrong numbers for a real account, fetch this endpoint with
// a real key and correct the field paths below to match.

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
    if (!data || typeof data !== "object") {
      return { message: "Kira AI profile response was not JSON." };
    }

    // Unwrap a possible envelope — the actual shape isn't confirmed yet.
    const p = data.data || data.user || data.profile || data;

    const quotas = {};

    // Monthly/plan token allowance — resets monthly per this provider's own
    // notice text in packages/providers/registry/kira.js ("Cá nhân 5,000,000
    // token/tháng"). Guessed field names — correct once verified.
    const tokenTotal = toFiniteNumber(
      p.token_limit ?? p.tokenLimit ?? p.monthly_token_limit ?? p.plan_token_limit,
      null,
    );
    const tokenRemaining = toFiniteNumber(
      p.token_balance ?? p.tokenBalance ?? p.remaining_tokens ?? p.remainingTokens,
      null,
    );
    if (tokenTotal !== null && tokenRemaining !== null) {
      quotas["Tokens (this cycle)"] = {
        used: Math.max(0, tokenTotal - tokenRemaining),
        total: tokenTotal,
        resetAt: p.token_reset_at ?? p.tokenResetAt ?? null,
      };
    }

    // Pay-as-you-go wallet balance (VND) — a credit pot, not a refilling
    // quota, so it's shown the same "unlimited while balance > 0" way
    // open-sse/services/usage/deepseek.js shows DeepSeek's balance.
    const walletBalance = toFiniteNumber(
      p.wallet_balance ?? p.walletBalance ?? p.balance_vnd ?? p.balance,
      null,
    );
    if (walletBalance !== null) {
      quotas["Wallet balance (VND)"] = {
        used: 0,
        total: Math.max(0, walletBalance),
        remainingPercentage: walletBalance > 0 ? 100 : 0,
        resetAt: null,
        unlimited: walletBalance > 0,
      };
    }

    if (Object.keys(quotas).length === 0) {
      return {
        plan: "Kira AI",
        message: "Kira AI connected, but no recognized usage fields were found in the profile response — field names in packages/providers/usage/kira.js need updating to match the real API.",
      };
    }

    return { plan: "Kira AI", quotas };
  } catch (error) {
    return { message: `Kira AI error: ${error.message}` };
  }
}
