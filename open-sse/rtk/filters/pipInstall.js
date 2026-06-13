// Collapse pip install output: only ERR, WARN, and summary
export function pipInstall(text) {
  const lines = text.split("\n");
  const result = [];
  let requirements = 0;
  let installed = [];
  
  for (const line of lines) {
    // Always keep errors and warnings
    if (line.startsWith("ERROR:") || line.startsWith("WARNING:")) {
      result.push(line);
      continue;
    }
    
    // Track installed packages (collapse)
    if (line.startsWith("Successfully installed ")) {
      const pkgs = line.replace("Successfully installed ", "").trim().split(/\s+/);
      installed = pkgs;
      continue;
    }
    
    // Collapse "Requirement already satisfied" and "Collecting" into count
    if (line.startsWith("Collecting ")) requirements++;
    if (line.startsWith("Requirement already satisfied:")) {
      if (!result.find(l => l.startsWith("Requirements already satisfied: "))) {
        // Only show count the first time
      }
      continue;
    }
    
    // Keep final status lines
    if (line.includes("installed") && !line.startsWith("Collecting")) {
      if (!result.includes(line)) result.push(line);
    }
  }
  
  // Build summary
  const summary = [];
  if (requirements > 0) summary.push(`[pip-install] ${requirements} packages collected`);
  if (installed.length > 0) {
    const preview = installed.slice(0, 5);
    summary.push(`[pip-install] installed: ${preview.join(", ")}${installed.length > 5 ? ` (+${installed.length - 5} more)` : ""}`);
  }
  
  if (result.length === 0 && summary.length === 0) return text;
  return [...summary, ...result].join("\n");
}

pipInstall.filterName = "pip-install";