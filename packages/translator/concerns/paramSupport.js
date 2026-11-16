// Extra stripUnsupportedParams rules for providers registered in packages/ (not upstream).
// Merged into STRIP_RULES by open-sse/translator/concerns/paramSupport.js — same rule shape.
import { KIRAAI_OUTPUT_LIMITS } from "./kiraaiOutputLimits.js";

// Upstream caps the kiraai catalog gets wrong, verified by live 400s; these win over
// KIRAAI_OUTPUT_LIMITS. Without a cap, claude→openai floors tool requests at 32000.
export const KIRAAI_OUTPUT_OVERRIDES = {
  // Catalog says output_limit 262144; upstream: "`max_tokens` must be less than or equal to `16384`".
  "qwen3.8-flash-next-sale": 16384,
};

const kiraaiLimits = { ...KIRAAI_OUTPUT_LIMITS, ...KIRAAI_OUTPUT_OVERRIDES };

export const PARAM_STRIP_RULES = [
  // One rule per kiraai chat model: clamp max_tokens to its output limit.
  ...Object.entries(kiraaiLimits).map(([id, cap]) => ({
    provider: "kiraai",
    match: (model) => model === id,
    maxOutputCap: cap,
  })),
];
