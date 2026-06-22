import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { getModelsDevStatus } from "open-sse/services/modelsDevService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const settings = await getSettings();
    const status = await getModelsDevStatus();

    return NextResponse.json({
      enabled: settings.modelsDevEnabled ?? false,
      preferPrices: settings.modelsDevPreferPrices ?? false,
      autoSyncHours: settings.modelsDevAutoSyncHours ?? 24,
      ...status,
    }, { headers: { "Cache-Control": "no-store", ...CORS_HEADERS } });
  } catch (error) {
    console.log("Error getting models-dev status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const allowedKeys = ["modelsDevEnabled", "modelsDevPreferPrices", "modelsDevAutoSyncHours"];
    const updates = {};

    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const settings = await updateSettings(updates);
    const status = await getModelsDevStatus();

    return NextResponse.json({
      enabled: settings.modelsDevEnabled,
      preferPrices: settings.modelsDevPreferPrices,
      autoSyncHours: settings.modelsDevAutoSyncHours,
      ...status,
    }, { headers: { "Cache-Control": "no-store", ...CORS_HEADERS } });
  } catch (error) {
    console.log("Error updating models-dev settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
