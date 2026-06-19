import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import { getAdapter } from "@/lib/db/driver.js";
import { CmemEngine } from "@9router/cmem";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  try {
    const { action, text, targetFormat } = await request.json();
    const settings = await getSettings();
    if (!settings.cmemEnabled) {
      return NextResponse.json({ error: "CMEM is disabled" }, { status: 400 });
    }

    const db = await getAdapter();
    const engine = new CmemEngine({ enabled: true, config: settings.cmemConfig, db });
    await engine.init();

    if (action === "capture") {
      const result = await engine.captureObservation({
        model: "test",
        messages: [{ role: "user", content: text || "test input" }],
        response: text || "test output",
        provider: "test",
      });
      return NextResponse.json({
        captured: !!result,
        observation: result || null,
      });
    }

    if (action === "inject") {
      const body = {
        messages: [{ role: "user", content: text || "test prompt" }],
      };
      const injected = await engine.injectContext(body, targetFormat || "openai", 4000);
      return NextResponse.json({
        injected: !!injected,
        messages: injected?.messages || null,
      });
    }

    if (action === "search") {
      const result = await engine.search(text || "", { limit: 10 });
      return NextResponse.json(result);
    }

    const stats = await engine.getStats();
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
