import { NextResponse } from "next/server";
import { getSettings, getCombos } from "@/lib/localDb";
import { getRecentModelFailCounts } from "@/lib/errorLogDb/errorLogRepo.js";
import {
  groupFailingModelsByCombo,
  resolveComboAutoReorderConfig,
  isComboModelReorderSuppressed,
} from "@9router/combo-auto-reorder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/combo-auto-reorder/status - the models currently over the fail-rate
// threshold (and therefore demoted, or about to be at the next sweep tick), per combo.
// Reuses the exact same grouping logic the sweep itself uses (groupFailingModelsByCombo
// + the same suppression check), so this list never shows something the sweep
// wouldn't actually act on.
export async function GET() {
  try {
    const settings = await getSettings();
    const { threshold, windowMs } = resolveComboAutoReorderConfig(settings);

    if (!settings?.comboAutoReorderEnabled) {
      return NextResponse.json({ enabled: false, threshold, windowMs, demoted: [] });
    }

    const [failCounts, combos] = await Promise.all([
      getRecentModelFailCounts(windowMs),
      getCombos(),
    ]);
    const failingByCombo = groupFailingModelsByCombo(failCounts, threshold, isComboModelReorderSuppressed);
    const countByKey = new Map(failCounts.map((r) => [`${r.comboName}::${r.provider}/${r.model}`, r]));

    const demoted = [];
    for (const combo of combos) {
      const failing = failingByCombo.get(combo.name);
      if (!failing) continue;
      for (const modelStr of failing) {
        const row = countByKey.get(`${combo.name}::${modelStr}`);
        const slash = modelStr.indexOf("/");
        demoted.push({
          comboName: combo.name,
          provider: slash > 0 ? modelStr.slice(0, slash) : modelStr,
          model: slash > 0 ? modelStr.slice(slash + 1) : "",
          count: row?.count ?? 0,
        });
      }
    }
    demoted.sort((a, b) => b.count - a.count);

    return NextResponse.json({ enabled: true, threshold, windowMs, demoted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
