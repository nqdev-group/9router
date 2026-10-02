import { NextResponse } from "next/server";
import { getModelTokenLimits, updateModelTokenLimits, resetModelTokenLimit, resetAllModelTokenLimits } from "@/lib/localDb.js";
import { validateModelTokenLimits } from "@9router/validation";

/**
 * GET /api/model-token-limits
 * User-configured max-input-token overrides, per provider/model.
 * Shape: { [provider]: { [model]: number } }
 * Pair with GET /api/models (caps.contextWindow) on the client to show defaults
 * for models that don't have an override yet.
 */
export async function GET() {
  try {
    const limits = await getModelTokenLimits();
    return NextResponse.json(limits);
  } catch (error) {
    console.error("Error fetching model token limits:", error);
    return NextResponse.json({ error: "Failed to fetch model token limits" }, { status: 500 });
  }
}

/**
 * PATCH /api/model-token-limits
 * Body: { provider: { model: number } }
 */
export async function PATCH(request) {
  try {
    const body = await request.json();

    const { valid, errors } = validateModelTokenLimits(body);
    if (!valid) {
      return NextResponse.json({ error: "Invalid model token limits", details: errors }, { status: 400 });
    }

    const updated = await updateModelTokenLimits(body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating model token limits:", error);
    return NextResponse.json({ error: "Failed to update model token limits" }, { status: 500 });
  }
}

/**
 * DELETE /api/model-token-limits
 * Query params: ?provider=xxx&model=yyy (optional)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const model = searchParams.get("model");

    if (provider && model) {
      await resetModelTokenLimit(provider, model);
    } else if (provider) {
      await resetModelTokenLimit(provider);
    } else {
      await resetAllModelTokenLimits();
    }

    const limits = await getModelTokenLimits();
    return NextResponse.json(limits);
  } catch (error) {
    console.error("Error resetting model token limits:", error);
    return NextResponse.json({ error: "Failed to reset model token limits" }, { status: 500 });
  }
}
