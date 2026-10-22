// Pure daily-budget check. The caller supplies today's spend (queried from the
// usage DB) — this package never touches persistence directly.

/**
 * @param {number} spentTodayUsd
 * @param {number|null|undefined} dailyCapUsd - null/0/undefined = no cap
 * @returns {{ overBudget: boolean, remainingUsd: number|null }}
 */
export function checkDailyBudget(spentTodayUsd, dailyCapUsd) {
  if (!dailyCapUsd || dailyCapUsd <= 0) return { overBudget: false, remainingUsd: null };
  const spent = Number(spentTodayUsd) || 0;
  const remaining = dailyCapUsd - spent;
  return { overBudget: remaining <= 0, remainingUsd: Math.max(0, remaining) };
}
