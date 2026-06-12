import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { validatePrivacyConfig, DEFAULT_KEYWORDS } from "@9router/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettings();
    const { privacyEnabled, privacyCustomKeywords } = settings;

    return NextResponse.json({
      privacyEnabled: privacyEnabled !== false,
      privacyCustomKeywords: Array.isArray(privacyCustomKeywords) ? privacyCustomKeywords : [],
      defaultKeywords: DEFAULT_KEYWORDS,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const { valid, errors } = validatePrivacyConfig(body);
    if (!valid) {
      return NextResponse.json({ error: "Invalid privacy configuration", details: errors }, { status: 400 });
    }

    const sanitized = {};
    if (body.privacyEnabled !== undefined) {
      sanitized.privacyEnabled = body.privacyEnabled;
    }
    if (body.privacyCustomKeywords !== undefined) {
      sanitized.privacyCustomKeywords = body.privacyCustomKeywords.map(kw => kw.trim().toLowerCase());
    }

    await updateSettings(sanitized);

    const updated = await getSettings();
    return NextResponse.json({
      privacyEnabled: updated.privacyEnabled !== false,
      privacyCustomKeywords: Array.isArray(updated.privacyCustomKeywords) ? updated.privacyCustomKeywords : [],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
