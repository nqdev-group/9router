// Port of Rust git::compact_log (simplified)
export function gitLog(log) {
  const lines = log.split("\n");
  if (lines.length <= 12) return log;
  
  const result = [];
  result.push(...lines.slice(0, 5));
  result.push(`  ... (${lines.length - 10} commits truncated)`);
  result.push(...lines.slice(-5));
  
  return result.join("\n");
}

gitLog.filterName = "git-log";