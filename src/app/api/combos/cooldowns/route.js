import { NextResponse } from "next/server";
import { listActiveCooldowns } from "@9router/model-combo-cooldown";

export const dynamic = "force-dynamic";

// GET /api/combos/cooldowns - list models currently skipped inside a combo
// (in-memory state from packages/model-combo-cooldown, no DB involved)
export async function GET() {
  try {
    const cooldowns = listActiveCooldowns();
    return NextResponse.json({ cooldowns, count: cooldowns.length });
  } catch (error) {
    console.log("Error fetching combo cooldowns:", error);
    return NextResponse.json({ error: "Failed to fetch combo cooldowns" }, { status: 500 });
  }
}
