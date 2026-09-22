import { NextResponse } from "next/server";
import { getAccountErrorChartData } from "@/lib/errorLogDb/errorLogRepo.js";

export const dynamic = "force-dynamic";

// GET /api/error-stats/accounts - hourly error-frequency chart data, provider|account breakdown
export async function GET() {
  try {
    const data = await getAccountErrorChartData();
    return NextResponse.json(data);
  } catch (error) {
    console.log("Error fetching account error stats:", error);
    return NextResponse.json({ error: "Failed to fetch account error stats" }, { status: 500 });
  }
}
