import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { getAdapter } from "@/lib/db/driver.js";
import { CmemEngine } from "@9router/cmem";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const settings = await getSettings();
    if (!settings.cmemEnabled) {
      return NextResponse.json({ error: "CMEM is disabled" }, { status: 400 });
    }

    const db = await getAdapter();
    const engine = new CmemEngine({ enabled: true, config: settings.cmemConfig, db });
    await engine.init();

    const result = await engine.search("", { limit, offset });
    return NextResponse.json({
      ...result,
      observationsEnabled: settings.cmemConfig?.observationsEnabled !== false,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { observationsEnabled } = body;

    const settings = await getSettings();
    if (!settings.cmemEnabled) {
      return NextResponse.json({ error: "CMEM is disabled" }, { status: 400 });
    }

    const merged = { ...settings.cmemConfig, observationsEnabled: observationsEnabled !== false };
    await updateSettings({ cmemConfig: merged });

    return NextResponse.json({ success: true, observationsEnabled: merged.observationsEnabled });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const settings = await getSettings();
    if (!settings.cmemEnabled) {
      return NextResponse.json({ error: "CMEM is disabled" }, { status: 400 });
    }

    const db = await getAdapter();
    const engine = new CmemEngine({ enabled: true, config: settings.cmemConfig, db });
    await engine.init();

    if (id) {
      await engine.deleteObservation(id);
    } else {
      await engine.clearAllObservations();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
