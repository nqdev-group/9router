import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { validateComboAutoReorderConfig } from "@9router/validation";
import {
  DEFAULT_COMBO_AUTO_REORDER_FAIL_THRESHOLD,
  DEFAULT_COMBO_AUTO_REORDER_WINDOW_MS,
  DEFAULT_COMBO_AUTO_REORDER_SWEEP_INTERVAL_MS,
} from "@9router/combo-auto-reorder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickSettings(settings) {
  return {
    comboAutoReorderEnabled: !!settings.comboAutoReorderEnabled,
    comboAutoReorderFailThreshold: settings.comboAutoReorderFailThreshold ?? DEFAULT_COMBO_AUTO_REORDER_FAIL_THRESHOLD,
    comboAutoReorderWindowMs: settings.comboAutoReorderWindowMs ?? DEFAULT_COMBO_AUTO_REORDER_WINDOW_MS,
    comboAutoReorderIntervalMs: settings.comboAutoReorderIntervalMs ?? DEFAULT_COMBO_AUTO_REORDER_SWEEP_INTERVAL_MS,
  };
}

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(pickSettings(settings));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const { valid, errors } = validateComboAutoReorderConfig(body);
    if (!valid) {
      return NextResponse.json({ error: "Invalid combo-auto-reorder configuration", details: errors }, { status: 400 });
    }

    await updateSettings(body);
    const updated = await getSettings();
    return NextResponse.json(pickSettings(updated));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
