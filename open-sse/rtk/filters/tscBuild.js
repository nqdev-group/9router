// Compact TypeScript compiler output: group by file, show only error locations
export function tscBuild(text) {
  const lines = text.split("\n");
  const fileGroups = {};
  let currentFile = "";
  let errorCount = 0;
  let hasSummary = false;
  
  for (const line of lines) {
    // Track summary
    if (line.match(/^Found \d+ errors?/) || line.trim().startsWith("error TS")) {
      hasSummary = true;
    }
    
    // Match TypeScript errors: src/file.ext:line:col - error TS1234: message
    const match = line.match(/^([^(]+\(\d+,\d+\)):\s+error\s+(TS\d+):\s+(.+)/);
    if (match) {
      const file = match[1].replace(/\(\d+,\d+\)/, "").trim();
      if (!fileGroups[file]) fileGroups[file] = [];
      fileGroups[file].push({
        location: match[1],
        code: match[2],
        message: match[3].length > 100 ? match[3].slice(0, 97) + "..." : match[3],
      });
      errorCount++;
    }
  }
  
  if (Object.keys(fileGroups).length === 0) return text;
  
  const result = [];
  result.push(`[tsc-build] ${errorCount} error(s) in ${Object.keys(fileGroups).length} file(s)`);
  
  for (const [file, errors] of Object.entries(fileGroups)) {
    result.push(`\n${file}: ${errors.length} error(s)`);
    for (const err of errors.slice(0, 3)) {
      result.push(`  ${err.location}  ${err.code}: ${err.message}`);
    }
    if (errors.length > 3) {
      result.push(`  ... (${errors.length - 3} more errors in this file)`);
    }
  }
  
  return result.join("\n");
}

tscBuild.filterName = "tsc-build";