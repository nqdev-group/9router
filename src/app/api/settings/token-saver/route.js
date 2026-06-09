import { NextResponse } from "next/server";
import { getTokenSaverStats, getTokenSaverChartData, getTokenSaverPerRequest } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stats";
    const period = searchParams.get("period") || "30d";
    const page = parseInt(searchParams.get("page"), 10) || 1;
    const limit = parseInt(searchParams.get("limit"), 10) || 50;

    if (action === "chart") {
      const data = await getTokenSaverChartData(period);
      return NextResponse.json(data);
    }

    if (action === "per-request") {
      const data = await getTokenSaverPerRequest(page, limit);
      return NextResponse.json(data);
    }

    // Default: stats
    const stats = await getTokenSaverStats(period);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Token saver API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
