import { NextResponse } from "next/server";
import { getTokenSaverStats, getTokenSaverChartData, getTokenSaverPerRequest } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Handle GET requests for the Token Saver Report API.
 * @description This function handles GET requests for the Token Saver Report API. It retrieves statistics, chart data, or per-request data based on the provided query parameters.
 * @param {*} request - The incoming request object containing query parameters for action, period, page, and limit.
 * @returns {Promise<NextResponse>} A JSON response containing the requested data or an error message.
 */
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
