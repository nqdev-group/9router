import { NextResponse } from "next/server";
import { getCombos } from "@/lib/localDb";

export const dynamic = "force-dynamic";

// GET /api/combos/using-model?model=<provider/model> - which combos declare this
// model, for the error-stats page's "show combos using this model" action.
// Query-param, not a dynamic path segment, because model strings contain "/".
export async function GET(request) {
  try {
    const model = new URL(request.url).searchParams.get("model");
    if (!model) {
      return NextResponse.json({ error: "model query param is required" }, { status: 400 });
    }
    const combos = await getCombos();
    const matches = combos.filter((c) => Array.isArray(c.models) && c.models.includes(model));
    return NextResponse.json({ combos: matches.map((c) => ({ id: c.id, name: c.name })) });
  } catch (error) {
    console.log("Error fetching combos using model:", error);
    return NextResponse.json({ error: "Failed to fetch combos using model" }, { status: 500 });
  }
}
