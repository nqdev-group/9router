// Compact JSON log lines: extract timestamp, level, message
export function jsonLog(text) {
  const lines = text.split("\n");
  const result = [];
  let validJson = 0;
  
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const ts = obj.timestamp || obj.time || obj.datetime || "";
      const level = obj.level || obj.level || obj.lvl || "INFO";
      const msg = obj.message || obj.msg || obj.m || "";
      
      let formatted = `[${ts}] ${level}: `;
      
      if (typeof msg === "string") {
        // Truncate long messages
        formatted += msg.length > 100 ? msg.slice(0, 97) + "..." : msg;
      } else if (typeof msg === "object") {
        // Format common fields
        const parts = [];
        if (obj.method) parts.push(`method=${obj.method}`);
        if (obj.path) parts.push(`path=${obj.path}`);
        if (obj.status) parts.push(`status=${obj.status}`);
        if (obj.userId) parts.push(`user=${obj.userId}`);
        if (Object.keys(obj).length === 0) parts.push(JSON.stringify(obj).slice(0, 50));
        formatted += parts.length ? "{" + parts.join(", ") + "}" : "{object}";
      } else {
        formatted += String(msg).slice(0, 100);
      }
      
      result.push(formatted);
      validJson++;
    } catch (e) {
      // Not JSON, pass through (maybe headers)
      if (line.trim() && line.length < 200) {
        result.push(line);
      }
    }
  }
  
  if (validJson === 0) return text; // No JSON lines found
  return result.join("\n");
}

jsonLog.filterName = "json-log";