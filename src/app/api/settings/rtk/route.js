import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { validateRtkConfig } from "@9router/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettings();
    const { rtkEnabled, rtkConfig } = settings;

    // Get available filters from the RTK module
    const { allFilters } = await import("open-sse/rtk/registry.js");
    const filters = allFilters();

    // Get stats from usageDb (we need to implement this in usageDb or calculate)
    // For now, we'll return placeholder stats; this should be enhanced later
    const stats = {
      totalRequests: 0,
      totalSaved: 0,
      byFilter: {}
    };

    return NextResponse.json({
      rtkEnabled,
      rtkConfig,
      filters,
      stats
    });
  } catch (error) {
    console.log("Error getting RTK config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { rtkConfig } = body;

    if (rtkConfig !== undefined) {
      const { valid, errors } = validateRtkConfig(rtkConfig);
      if (!valid) {
        return NextResponse.json({ error: "Invalid RTK configuration", details: errors }, { status: 400 });
      }

      // Merge with existing settings
      const settings = await getSettings();
      const mergedConfig = { ...settings.rtkConfig, ...rtkConfig };
      await updateSettings({ rtkConfig: mergedConfig });
    }

    const updatedSettings = await getSettings();
    const { password, oidcClientSecret, ...safeSettings } = updatedSettings;
    safeSettings.oidcConfigured = !!(safeSettings.oidcIssuerUrl && safeSettings.oidcClientId && oidcClientSecret);
    return NextResponse.json(safeSettings);
  } catch (error) {
    console.log("Error updating RTK config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}