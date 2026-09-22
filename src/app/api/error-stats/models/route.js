import { NextResponse } from "next/server";
import { getModelErrorChartData, getFailingModels } from "@/lib/errorLogDb/errorLogRepo.js";

export const dynamic = "force-dynamic";

// GET /api/error-stats/models - hourly error-frequency chart data (provider|model|combo
// breakdown) plus the aggregated failing-models list the UI attaches actions to
// (show combos using this model / remove from all combos — see Phase 2).
export async function GET() {
  try {
    const [chart, failingModels] = await Promise.all([getModelErrorChartData(), getFailingModels()]);
    return NextResponse.json({ ...chart, failingModels });
  } catch (error) {
    console.log("Error fetching model error stats:", error);
    return NextResponse.json({ error: "Failed to fetch model error stats" }, { status: 500 });
  }
}
