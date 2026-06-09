// Dedup + truncate Docker log output
// Collapse repeated lines and truncate very long lines
export function dockerLogs(text) {
  const lines = text.split("\n");
  if (lines.length <= 10) return text;
  
  const result = [];
  let repeats = 0;
  let lastLine = "";
  let skippedLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Collapse timestamps prefix (keep first and last 10 chars of timestamp)
    let cleanLine = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^ ]+\s+/, "[TIMESTAMP] ");
    
    // Truncate very long lines (JSON payloads, etc.)
    if (cleanLine.length > 500) {
      cleanLine = cleanLine.slice(0, 200) + "... [truncated " + (cleanLine.length - 200) + " chars]";
    }
    
    // Collapse consecutive identical lines
    if (cleanLine === lastLine) {
      repeats++;
      if (repeats === 2) {
        result.push(`  ... (same line repeated)`);
      }
      skippedLines++;
      continue;
    } else {
      repeats = 0;
      if (skippedLines > 2) {
        // Update the repeat count line
        const repeatIdx = result.length - 1;
        result[repeatIdx] = `  ... (same line repeated ${skippedLines - 1} times)`;
      }
      skippedLines = 0;
    }
    
    lastLine = cleanLine;
    result.push(cleanLine);
  }
  
  // Truncate if output is very large
  if (result.length > 200) {
    const truncated = [
      ...result.slice(0, 50),
      `... (${result.length - 100} lines of log output collapsed)`,
      ...result.slice(-50),
    ];
    result.length = 0;
    result.push(...truncated);
  }
  
  return result.join("\n");
}

dockerLogs.filterName = "docker-logs";