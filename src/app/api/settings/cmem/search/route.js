import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import { getAdapter } from "@/lib/db/driver.js";
import { CmemEngine } from "@9router/cmem";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  try {
    const { query, limit = 20, type } = await request.json();
    const settings = await getSettings();
    if (!settings.cmemEnabled) {
      return NextResponse.json({ error: "CMEM is disabled" }, { status: 400 });
    }

    const db = await getAdapter();
    const engine = new CmemEngine({ enabled: true, config: settings.cmemConfig, db });
    await engine.init();

    const result = await engine.search(query || "", { limit, type });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
