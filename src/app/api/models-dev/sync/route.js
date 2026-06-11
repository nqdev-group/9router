import { NextResponse } from "next/server";
import { syncModelsDevPricing, clearModelsDevData } from "open-sse/services/modelsDevService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const SYNC_COOLDOWN_MS = 30000;
let lastSyncAt = 0;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST() {
  try {
    const now = Date.now();
    if (now - lastSyncAt < SYNC_COOLDOWN_MS) {
      const retryAfter = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSyncAt)) / 1000);
      return NextResponse.json(
        { error: `Sync too frequent. Retry in ${retryAfter}s` },
        { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(retryAfter) } }
      );
    }

    lastSyncAt = now;
    const result = await syncModelsDevPricing();
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (error) {
    console.log("Error syncing models-dev:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearModelsDevData();
    return NextResponse.json({ cleared: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.log("Error clearing models-dev data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
