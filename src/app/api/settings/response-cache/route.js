import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { getResponseCache, resetResponseCache } from "open-sse/services/responseCache.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettings();
    const cache = getResponseCache();
    const { responseCacheEnabled, responseCacheMaxSize, responseCacheTtlMs } = settings;
    const stats = cache.stats();

    return NextResponse.json({
      enabled: !!responseCacheEnabled,
      maxSize: responseCacheMaxSize || 100,
      ttlMs: responseCacheTtlMs || 300000,
      stats,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    if (body.maxSize !== undefined || body.ttlMs !== undefined) {
      resetResponseCache();
    }

    const updates = {};
    if (body.enabled !== undefined) updates.responseCacheEnabled = !!body.enabled;
    if (body.maxSize !== undefined) updates.responseCacheMaxSize = Math.max(1, Math.min(10000, body.maxSize));
    if (body.ttlMs !== undefined) updates.responseCacheTtlMs = Math.max(1000, Math.min(86400000, body.ttlMs));

    if (Object.keys(updates).length > 0) {
      await updateSettings(updates);
    }

    const updated = await getSettings();
    const cache = getResponseCache();
    return NextResponse.json({
      enabled: !!updated.responseCacheEnabled,
      maxSize: updated.responseCacheMaxSize || 100,
      ttlMs: updated.responseCacheTtlMs || 300000,
      stats: cache.stats(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    resetResponseCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
