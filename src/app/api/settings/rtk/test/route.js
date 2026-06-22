import { NextResponse } from "next/server";
import { compressMessages } from "open-sse/rtk/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, filters } = body;

    if (typeof text !== "string") {
      return NextResponse.json({ error: "Text must be a string" }, { status: 400 });
    }

    // Simulate a request body with tool_result content
    // We'll create a minimal OpenAI-like messages array with one tool message
    const fakeBody = {
      messages: [
        {
          role: "tool",
          content: text
        }
      ]
    };

    // We need to enable RTK and pass the config with filters if provided
    const rtkEnabled = true;
    let rtkConfig = null;
    if (filters) {
      // Build an enabledFilters object from the filters array
      const enabledFilters = {};
      filters.forEach(f => { enabledFilters[f] = true; });
      rtkConfig = { enabledFilters };
    }

    const stats = compressMessages(fakeBody, rtkEnabled, rtkConfig);

    if (!stats) {
      return NextResponse.json({ 
        originalLength: text.length,
        compressedLength: text.length,
        savings: 0,
        savingsPercent: 0,
        appliedFilters: []
      });
    }

    const savings = stats.bytesBefore - stats.bytesAfter;
    const savingsPercent = stats.bytesBefore > 0 ? (savings / stats.bytesBefore * 100) : 0;

    // Extract compressed text from modified body
    const compressedText = fakeBody?.messages?.[0]?.content || null;

    return NextResponse.json({
      originalLength: stats.bytesBefore,
      compressedLength: stats.bytesAfter,
      savings,
      savingsPercent: Number(savingsPercent.toFixed(2)),
      appliedFilters: stats.hits.map(h => h.filter),
      compressedText
    });
  } catch (error) {
    console.log("Error testing RTK compression:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}