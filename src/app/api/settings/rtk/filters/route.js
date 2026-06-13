import { NextResponse } from "next/server";
import { allFilters } from "open-sse/rtk/registry.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const filters = allFilters();
    return NextResponse.json({ filters });
  } catch (error) {
    console.log("Error getting RTK filters:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}