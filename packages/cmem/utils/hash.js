export function hashContent(content) {
  let hash = 0;
  if (!content) return "0";
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function hashObject(obj) {
  return hashContent(JSON.stringify(obj));
}
