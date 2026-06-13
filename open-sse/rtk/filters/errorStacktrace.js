// Collapse stack trace frames: keep top 3, bottom 3, and first cause chain
export function errorStacktrace(text) {
  const lines = text.split("\n");
  const result = [];
  let stackFrames = [];
  let inStack = false;
  let inCause = false;
  let causeFrames = [];
  let headerLines = [];
  let afterStack = [];
  
  for (const line of lines) {
    // Detect stack frame lines: "    at functionName (file:line:col)"
    if (line.trimStart().startsWith("at ") && line.includes("(")) {
      if (!inStack) {
        inStack = true;
      }
      stackFrames.push(line);
      continue;
    }
    
    // Caused by: trigger
    if (line.trim().toLowerCase().startsWith("caused by:")) {
      inCause = true;
      continue;
    }
    
    if (inCause) {
      if (line.trimStart().startsWith("at ") && line.includes("(")) {
        causeFrames.push(line);
        continue;
      }
      inCause = false;
    }
    
    if (inStack) {
      afterStack.push(line);
    } else {
      headerLines.push(line);
    }
  }
  
  // Header: error type and message
  result.push(...headerLines);
  
  // Stack frames: top 3, bottom 3
  if (stackFrames.length > 0) {
    if (stackFrames.length <= 6) {
      result.push(...stackFrames);
    } else {
      result.push(...stackFrames.slice(0, 3));
      result.push(`  ... (${stackFrames.length - 6} frames omitted)`);
      result.push(...stackFrames.slice(-3));
    }
  }
  
  // Cause chain: top 2
  if (causeFrames.length > 0) {
    result.push("caused by:");
    result.push(...causeFrames.slice(0, 2));
    if (causeFrames.length > 2) {
      result.push(`  ... (${causeFrames.length - 2} frames omitted)`);
    }
  }
  
  // After stack: limited
  if (afterStack.length > 0) {
    result.push(...afterStack.slice(0, 5));
    if (afterStack.length > 5) {
      result.push(`... (${afterStack.length - 5} more lines)`);
    }
  }
  
  return result.join("\n");
}

errorStacktrace.filterName = "error-stacktrace";