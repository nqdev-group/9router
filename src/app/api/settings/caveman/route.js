import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { validateCavemanConfig, VALID_CAVEMAN_LEVELS } from "@9router/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettings();
    const { cavemanEnabled, cavemanLevel } = settings;

    return NextResponse.json({
      cavemanEnabled: !!cavemanEnabled,
      cavemanLevel: cavemanLevel || "full",
      validLevels: VALID_CAVEMAN_LEVELS,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const { valid, errors } = validateCavemanConfig(body);
    if (!valid) {
      return NextResponse.json({ error: "Invalid caveman configuration", details: errors }, { status: 400 });
    }

    await updateSettings(body);

    const updated = await getSettings();
    return NextResponse.json({
      cavemanEnabled: !!updated.cavemanEnabled,
      cavemanLevel: updated.cavemanLevel || "full",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
