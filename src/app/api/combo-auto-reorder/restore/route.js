import { NextResponse } from "next/server";
import { getSettings, getComboByName, updateCombo } from "@/lib/localDb";
import { resetComboRotation } from "open-sse/services/combo.js";
import { restoreModelNow, suppressComboModelReorder } from "@9router/combo-auto-reorder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/combo-auto-reorder/restore { comboName, provider, model } - manual
// override: moves the model back into the healthy group of that combo immediately,
// and suppresses re-demotion for the current rolling window so the next sweep tick
// doesn't just demote it right back based on the same still-in-window error rows.
export async function POST(request) {
  try {
    const body = await request.json();
    const { comboName, provider, model } = body || {};
    if (!comboName || !provider || !model) {
      return NextResponse.json({ error: "comboName, provider and model are required" }, { status: 400 });
    }

    const result = await restoreModelNow(
      { getSettings, getComboByName, updateCombo, resetComboRotation, suppressComboModelReorder },
      { comboName, provider, model }
    );

    if (!result.restored) {
      return NextResponse.json({ error: result.reason || "restore failed" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
