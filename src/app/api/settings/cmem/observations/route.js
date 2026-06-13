import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
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
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const settings = await getSettings();
    if (!settings.cmemEnabled) {
      return NextResponse.json({ error: "CMEM is disabled" }, { status: 400 });
    }

    const db = await getAdapter();
    const engine = new CmemEngine({ enabled: true, config: settings.cmemConfig, db });
    await engine.init();
    await engine.deleteObservation(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
