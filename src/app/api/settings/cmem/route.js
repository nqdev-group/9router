import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { validateCmemConfig } from "@9router/validation";
import { initCmemTables } from "@/lib/db/repos/cmemRepo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettings();
    const { cmemEnabled, cmemConfig } = settings;

    return NextResponse.json({
      cmemEnabled: cmemEnabled || false,
      cmemConfig: cmemConfig || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { cmemConfig } = body;

    if (cmemConfig !== undefined) {
      const { valid, errors } = validateCmemConfig(cmemConfig);
      if (!valid) {
        return NextResponse.json({ error: "Invalid CMEM configuration", details: errors }, { status: 400 });
      }

      const settings = await getSettings();
      const mergedConfig = { ...settings.cmemConfig, ...cmemConfig };
      await updateSettings({ cmemConfig: mergedConfig });
    }

    const updatedSettings = await getSettings();
    return NextResponse.json({
      cmemEnabled: updatedSettings.cmemEnabled || false,
      cmemConfig: updatedSettings.cmemConfig || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
