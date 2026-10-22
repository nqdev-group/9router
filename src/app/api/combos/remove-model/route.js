import { NextResponse } from "next/server";
import { getCombos, updateCombo } from "@/lib/localDb";
import { clearModelCooldown } from "@9router/model-combo-cooldown";

export const dynamic = "force-dynamic";

// POST /api/combos/remove-model { model } - remove this model from every combo
// that declares it, and clear its in-memory cooldown for each affected combo
// (decided 2026-09-22 — stale cooldown state shouldn't linger for a model/combo
// pairing that no longer exists). Destructive bulk action — UI must confirm
// before calling this.
export async function POST(request) {
  try {
    const body = await request.json();
    const model = body?.model;
    if (!model) {
      return NextResponse.json({ error: "model is required" }, { status: 400 });
    }

    const combos = await getCombos();
    const affected = combos.filter((c) => Array.isArray(c.models) && c.models.includes(model));

    for (const combo of affected) {
      const nextModels = combo.models.filter((m) => m !== model);
      await updateCombo(combo.id, { models: nextModels });
      clearModelCooldown(combo.name, model);
    }

    return NextResponse.json({ removedFrom: affected.map((c) => c.name), count: affected.length });
  } catch (error) {
    console.log("Error removing model from combos:", error);
    return NextResponse.json({ error: "Failed to remove model from combos" }, { status: 500 });
  }
}
