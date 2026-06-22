// Collapse npm install output: only ERR, WARN, and summary
export function npmInstall(text) {
  const lines = text.split("\n");
  const result = [];
  let added = 0, removed = 0, audited = false;
  
  for (const line of lines) {
    // Always keep errors and warnings
    if (line.startsWith("npm ERR") || line.startsWith("npm WARN")) {
      result.push(line);
      continue;
    }
    
    // Keep audit summary
    if (line.startsWith("audited ")) {
      audited = true;
      result.push(line);
      continue;
    }
    
    // Keep added/removed metrics
    const addMatch = line.match(/^added (\d+)/);
    const remMatch = line.match(/^removed (\d+)/);
    if (addMatch) added += parseInt(addMatch[1]);
    if (remMatch) removed += parseInt(remMatch[1]);
    
    // Keep vulnerability report
    if (line.match(/^\d+ vulnerabilities?/) || line.match(/found \d+/)) {
      result.push(line);
    }
  }
  
  // Build summary header
  const summary = [];
  if (added || removed || audited) {
    summary.push(`[npm-install] added ${added}, removed ${removed}${audited ? ", audited" : ""}`);
  }
  
  if (result.length === 0) return text;
  return [...summary, ...result].join("\n");
}

npmInstall.filterName = "npm-install";