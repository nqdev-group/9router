import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { validateTokenLimitRoutingConfig } from "@9router/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickSettings(settings) {
  return {
    tokenLimitRoutingEnabled: !!settings.tokenLimitRoutingEnabled,
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

    const { valid, errors } = validateTokenLimitRoutingConfig(body);
    if (!valid) {
      return NextResponse.json({ error: "Invalid token-limit-routing configuration", details: errors }, { status: 400 });
    }

    await updateSettings(body);

    const updated = await getSettings();
    return NextResponse.json(pickSettings(updated));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
