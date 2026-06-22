// Compact git show output - keep diff + collapse commit message
// Note: does not call gitDiff to avoid circular dependency; simple diff heuristic
export function gitShow(text) {
  const lines = text.split("\n");
  let commitMsgStart = -1;
  let diffStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("    ") && commitMsgStart === -1) commitMsgStart = i;
    if (lines[i].startsWith("diff --git") && diffStart === -1) diffStart = i;
  }
  
  const result = [];
  // Header lines (commit hash, author, date)
  const headerEnd = commitMsgStart > 2 ? commitMsgStart - 1 : 4;
  result.push(...lines.slice(0, headerEnd));
  
  // First line of commit message only
  if (commitMsgStart > 0 && commitMsgStart < lines.length) {
    result.push("    " + (lines[commitMsgStart]?.trim() || ""));
    result.push("    [commit message truncated]");
  }
  
  // Keep diff part (use simple passthrough for diff section)
  if (diffStart > 0) {
    result.push("");
    for (let i = diffStart; i < lines.length; i++) {
      result.push(lines[i]);
    }
  }
  
  return result.join("\n");
}

gitShow.filterName = "git-show";