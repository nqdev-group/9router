"use client";

import Card from "@/shared/components/Card";

const LEVEL_INFO = {
  lite: {
    rules: "Drop filler (just/really/basically/sure), keep grammar and full sentences.",
    example:
      "Not: \"Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by...\"\nYes: \"Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:\"",
  },
  full: {
    rules: "Drop articles (a/an/the), filler, pleasantries, hedging. Fragments OK.",
    example: "Pattern: [thing] [action] [reason]. [next step].",
  },
  ultra: {
    rules: "Telegraphic. Abbreviate (DB/auth/config/req/res), strip conjunctions, arrows for causality.",
    example: "Pattern: [thing] → [result]. [fix].",
  },
  "wenyan-lite": {
    rules: "Semi-classical. Drop filler/hedging, keep grammar, classical Chinese register.",
    example: "Keep English for technical terms.",
  },
  wenyan: {
    rules: "Classical Chinese (文言文). Max classical terseness. 80-90% character reduction.",
    example: "Keep English for code, commands, function names, error strings.",
  },
  "wenyan-ultra": {
    rules: "Extreme classical compression. One classical particle per clause.",
    example: "Maximum compression of classical Chinese text.",
  },
};

export function InfoPanel({ level }) {
  const info = LEVEL_INFO[level] || LEVEL_INFO.full;

  return (
    <Card title="How It Works" subtitle="Caveman injects terse-style prompts into system message" icon="info">
      <div className="space-y-3">
        <div className="bg-surface rounded-lg p-3 border border-border-subtle">
          <p className="text-xs font-semibold text-text-main mb-1">Active Level: <span className="text-primary">{level}</span></p>
          <p className="text-xs text-text-muted">{info.rules}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border-subtle">
          <p className="text-xs font-semibold text-text-main mb-1">Example</p>
          <pre className="text-xs text-text-muted whitespace-pre-wrap">{info.example}</pre>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border-subtle">
          <p className="text-xs font-semibold text-text-main mb-1">Boundaries</p>
          <p className="text-xs text-text-muted">Code blocks, file paths, commands, errors, URLs: keep exact. Security warnings, irreversible action confirmations, multi-step sequences: written normally.</p>
        </div>
      </div>
    </Card>
  );
}
