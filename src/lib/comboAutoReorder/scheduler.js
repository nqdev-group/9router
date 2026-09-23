// Background sweep: periodically check each combo's models for fail-rate breaches and
// demote offending models to the end of the array. Independent of inbound requests,
// same lifecycle shape as src/sse/services/backgroundTokenRefresh.mjs. This file is the
// only place allowed to wire the pure packages/combo-auto-reorder logic to real DB
// access — the package itself never touches SQLite directly.
import {
  runComboAutoReorderSweep,
  isComboModelReorderSuppressed,
  DEFAULT_COMBO_AUTO_REORDER_SWEEP_INTERVAL_MS,
} from "@9router/combo-auto-reorder";
import { getSettings, getCombos, updateCombo } from "@/lib/localDb";
import { getRecentModelFailCounts } from "@/lib/errorLogDb/errorLogRepo.js";
import { resetComboRotation } from "open-sse/services/combo.js";

const INITIAL_DELAY_MS = 15 * 1000;

let started = false;
let intervalHandle = null;
let initialTimeoutHandle = null;
let tickRunning = false;

async function tick() {
  if (tickRunning) return;
  tickRunning = true;
  try {
    await runComboAutoReorderSweep({
      getSettings,
      getRecentModelFailCounts,
      getCombos,
      updateCombo,
      resetComboRotation,
      isSuppressed: isComboModelReorderSuppressed,
      onWarn: (msg) => console.warn(msg),
    });
  } catch (err) {
    console.warn(`[ComboAutoReorder] sweep tick failed (swallowed): ${err?.message || err}`);
  } finally {
    tickRunning = false;
  }
}

/**
 * Start the sweep interval. Safe to call multiple times (no-op if already started).
 * The interval cadence is read once from settings at startup — changing
 * `comboAutoReorderIntervalMs` afterwards takes effect on next process restart, same as
 * this codebase's other interval-based schedulers (watchdog, network monitor in
 * initializeApp.js). Whether the sweep actually does anything each tick is still fully
 * dynamic (comboAutoReorderEnabled/FailThreshold/WindowMs are read fresh every tick
 * inside runComboAutoReorderSweep), so toggling the feature off/on takes effect
 * immediately without a restart — only the tick cadence itself is fixed at startup.
 * @returns {Promise<boolean>} true if started this call
 */
export async function startComboAutoReorderSweep() {
  if (started) return false;
  started = true;

  let periodMs = DEFAULT_COMBO_AUTO_REORDER_SWEEP_INTERVAL_MS;
  try {
    const settings = await getSettings();
    if (Number.isFinite(settings?.comboAutoReorderIntervalMs) && settings.comboAutoReorderIntervalMs > 0) {
      periodMs = settings.comboAutoReorderIntervalMs;
    }
  } catch {
    // fall back to default
  }

  initialTimeoutHandle = setTimeout(tick, INITIAL_DELAY_MS);
  if (initialTimeoutHandle.unref) initialTimeoutHandle.unref();

  intervalHandle = setInterval(tick, periodMs);
  if (intervalHandle.unref) intervalHandle.unref();

  return true;
}

export function stopComboAutoReorderSweep() {
  if (initialTimeoutHandle) {
    clearTimeout(initialTimeoutHandle);
    initialTimeoutHandle = null;
  }
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  started = false;
}
