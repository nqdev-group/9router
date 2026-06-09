// Compact ESLint output: group by file, show only errors+warnings count
export function eslint(text) {
  const lines = text.split("\n");
  const fileGroups = {};
  let currentFile = "";
  let summaryLine = null;
  
  for (const line of lines) {
    // Track summary line
    if (line.match(/^\d+ problems?/) || line.match(/^\u2716/)) {
      summaryLine = line;
      continue;
    }
    
    // File header: eslint <path>
    const fileMatch = line.match(/^\/\/\s*(.+\.\w+)\s*$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      if (!fileGroups[currentFile]) {
        fileGroups[currentFile] = [];
      }
      continue;
    }
    
    // Match error/warning lines: line:col  error|warning  message  rule
    const match = line.match(/^\s*(\d+:\d+)\s+(error|warning)\s+(.+)/);
    if (match && currentFile) {
      fileGroups[currentFile].push({
        line: match[1],
        severity: match[2],
        message: match[3].length > 80 ? match[3].slice(0, 77) + "..." : match[3],
      });
    }
  }
  
  const result = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const [file, issues] of Object.entries(fileGroups)) {
    if (issues.length === 0) continue;
    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    totalErrors += errors;
    totalWarnings += warnings;
    
    result.push(`\n${file}`);
    result.push(`  ${errors} errors, ${warnings} warnings`);
    // Show first 5 issues per file
    for (const issue of issues.slice(0, 5)) {
      result.push(`  ${issue.line}  ${issue.severity}  ${issue.message}`);
    }
    if (issues.length > 5) {
      result.push(`  ... (${issues.length - 5} more issues in this file)`);
    }
  }
  
  if (summaryLine) result.push(`\n${summaryLine}`);
  
  if (result.length === 0) return text;
  return result.join("\n");
}

eslint.filterName = "eslint";