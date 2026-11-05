import { NextResponse } from "next/server";
import { getModelErrorChartData, getFailingModels } from "@/lib/errorLogDb/errorLogRepo.js";

export const dynamic = "force-dynamic";

// Absent params come back as null from searchParams.get(), and Number(null) is 0
// (finite) — parse to undefined explicitly so a missing param falls through to
// the repo's own 7-day default instead of silently becoming epoch 0.
function parseEpochParam(searchParams, key) {
  const raw = searchParams.get(key);
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

// GET /api/error-stats/models?since=<epochMs>&until=<epochMs> - hourly error-frequency
// chart data (provider|model|combo breakdown) plus the aggregated failing-models list
// the UI attaches actions to (show combos using this model / remove from all combos —
// see Phase 2). since/until default to the last 7 days when omitted or invalid.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = { since: parseEpochParam(searchParams, "since"), until: parseEpochParam(searchParams, "until") };

    const [chart, failingModels] = await Promise.all([getModelErrorChartData(range), getFailingModels(range)]);
    return NextResponse.json({ ...chart, failingModels });
  } catch (error) {
    console.log("Error fetching model error stats:", error);
    return NextResponse.json({ error: "Failed to fetch model error stats" }, { status: 500 });
  }
}
