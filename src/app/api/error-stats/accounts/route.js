import { NextResponse } from "next/server";
import { getAccountErrorChartData } from "@/lib/errorLogDb/errorLogRepo.js";

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

// GET /api/error-stats/accounts?since=<epochMs>&until=<epochMs> - hourly error-frequency
// chart data, provider|account breakdown. since/until default to the last 7 days when
// omitted or invalid.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getAccountErrorChartData({
      since: parseEpochParam(searchParams, "since"),
      until: parseEpochParam(searchParams, "until"),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.log("Error fetching account error stats:", error);
    return NextResponse.json({ error: "Failed to fetch account error stats" }, { status: 500 });
  }
}
