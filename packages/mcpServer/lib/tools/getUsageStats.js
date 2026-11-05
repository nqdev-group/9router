import { z } from "zod";
import { getUsageStats, getUsageHistory, getChartData } from "@/lib/usageDb.js";

const PERIODS = ["today", "24h", "7d", "30d", "60d", "all"];

export const getUsageStatsTool = {
  name: "get_usage_stats",
  title: "Get usage stats",
  description:
    "Query 9Router's own request/token/cost usage tracking — no equivalent REST-facing skill exists for this today (dashboard-only otherwise). Three views: \"summary\" (totals by provider/model/account), \"history\" (raw filtered request log), \"chart\" (time-bucketed series).",
  inputSchema: {
    view: z.enum(["summary", "history", "chart"]).default("summary"),
    period: z.enum(PERIODS).optional().describe('Defaults to "all" for summary, "7d" for chart. Ignored for history (use startDate/endDate).'),
    provider: z.string().optional().describe("Filter by provider id (history view only)."),
    model: z.string().optional().describe("Filter by model id (history view only)."),
    startDate: z.string().optional().describe("ISO date, inclusive (history view only)."),
    endDate: z.string().optional().describe("ISO date, inclusive (history view only)."),
  },
  async handler({ view, period, provider, model, startDate, endDate }) {
    let data;
    if (view === "history") {
      data = await getUsageHistory({ provider, model, startDate, endDate });
    } else if (view === "chart") {
      data = await getChartData(period || "7d");
    } else {
      data = await getUsageStats(period || "all");
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
};
