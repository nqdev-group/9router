import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { validateTierRoutingConfig, VALID_TIER_ROUTING_MODES } from "@9router/validation";
import { getTodaySpendUsd } from "@/lib/db/repos/usageRepo.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickSettings(settings) {
  return {
    tierRoutingEnabled: !!settings.tierRoutingEnabled,
    tierRoutingMode: settings.tierRoutingMode || "cheapest-first",
    tierRoutingDailyBudgetCapUsd: settings.tierRoutingDailyBudgetCapUsd ?? null,
    tierRoutingFreeTierThresholdUsd: settings.tierRoutingFreeTierThresholdUsd ?? 0.01,
  };
}

export async function GET() {
  try {
    const settings = await getSettings();
    const spentTodayUsd = await getTodaySpendUsd();

    return NextResponse.json({
      ...pickSettings(settings),
      spentTodayUsd,
      validModes: VALID_TIER_ROUTING_MODES,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const { valid, errors } = validateTierRoutingConfig(body);
    if (!valid) {
      return NextResponse.json({ error: "Invalid tier-routing configuration", details: errors }, { status: 400 });
    }

    await updateSettings(body);

    const updated = await getSettings();
    return NextResponse.json(pickSettings(updated));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
