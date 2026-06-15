import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseIgnoreProviders(raw) {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      providerAlertEnabled: !!settings.providerAlertEnabled,
      providerAlertWebhookUrl: settings.providerAlertWebhookUrl || "",
      providerAlertCooldown: settings.providerAlertCooldown ?? 15,
      providerAlertIgnoreProviders: parseIgnoreProviders(settings.providerAlertIgnoreProviders),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const sanitized = {};

    if (body.providerAlertEnabled !== undefined) {
      sanitized.providerAlertEnabled = !!body.providerAlertEnabled;
    }
    if (body.providerAlertWebhookUrl !== undefined) {
      const url = (body.providerAlertWebhookUrl || "").trim();
      if (url && !url.startsWith("https://discord.com/api/webhooks/") && !url.startsWith("https://ptb.discord.com/api/webhooks/") && !url.startsWith("https://canary.discord.com/api/webhooks/")) {
        return NextResponse.json({ error: "Invalid Discord webhook URL" }, { status: 400 });
      }
      sanitized.providerAlertWebhookUrl = url;
    }
    if (body.providerAlertCooldown !== undefined) {
      const cd = parseInt(body.providerAlertCooldown, 10);
      if (isNaN(cd) || cd < 1 || cd > 1440) {
        return NextResponse.json({ error: "Cooldown must be between 1 and 1440 minutes" }, { status: 400 });
      }
      sanitized.providerAlertCooldown = cd;
    }
    if (body.providerAlertIgnoreProviders !== undefined) {
      if (!Array.isArray(body.providerAlertIgnoreProviders)) {
        return NextResponse.json({ error: "ignoreProviders must be an array" }, { status: 400 });
      }
      sanitized.providerAlertIgnoreProviders = JSON.stringify(body.providerAlertIgnoreProviders.map(s => s.trim()).filter(Boolean));
    }

    await updateSettings(sanitized);
    const updated = await getSettings();
    return NextResponse.json({
      providerAlertEnabled: !!updated.providerAlertEnabled,
      providerAlertWebhookUrl: updated.providerAlertWebhookUrl || "",
      providerAlertCooldown: updated.providerAlertCooldown ?? 15,
      providerAlertIgnoreProviders: parseIgnoreProviders(updated.providerAlertIgnoreProviders),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
