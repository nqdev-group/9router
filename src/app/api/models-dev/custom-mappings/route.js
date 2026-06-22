import { NextResponse } from "next/server";
import {
  getModelsDevManualMappings,
  saveModelsDevManualMappings,
} from "open-sse/services/modelsDevService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const mappings = await getModelsDevManualMappings();
    return NextResponse.json(
      { manualMappings: mappings },
      { headers: { "Cache-Control": "no-store", ...CORS_HEADERS } }
    );
  } catch (error) {
    console.log("Error getting custom mappings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const mappings = body.manualMappings || {};

    if (typeof mappings !== "object" || Array.isArray(mappings)) {
      return NextResponse.json(
        { error: "manualMappings must be an object" },
        { status: 400 }
      );
    }

    await saveModelsDevManualMappings(mappings);
    return NextResponse.json(
      { manualMappings: mappings, saved: true },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.log("Error saving custom mappings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
