export const PERMANENT_ERROR_CODES = new Set([401, 402, 403, 404]);

const debounceMap = new Map();
const allDownState = new Map();

function hasActiveModelLock(connection) {
  const now = Date.now();
  for (const [key, val] of Object.entries(connection)) {
    if (!key.startsWith("modelLock_") || !val) continue;
    if (new Date(val).getTime() > now) return true;
  }
  return false;
}

function classifyConnections(connections) {
  let available = 0;
  let temporarilyDown = 0;
  let permanentlyDown = 0;
  /** @type {{ name: string, code: number, error: string }[]} */
  const errors = [];

  for (const c of connections) {
    const name = c.displayName || c.name || c.email || c.id?.slice(0, 8) || "unknown";

    if (c.isActive === 0) {
      permanentlyDown++;
      errors.push({ name, code: c.errorCode || 0, error: c.lastError || "Account disabled" });
    } else if (hasActiveModelLock(c)) {
      temporarilyDown++;
    } else if (c.testStatus === "unavailable" && PERMANENT_ERROR_CODES.has(c.errorCode)) {
      permanentlyDown++;
      errors.push({ name, code: c.errorCode, error: c.lastError || "Permanent failure" });
    } else if (c.testStatus !== "unavailable") {
      available++;
    } else {
      temporarilyDown++;
    }
  }

  return { available, temporarilyDown, permanentlyDown, errors, total: connections.length };
}

export function checkAllAccountsDown(provider, connections, cooldownMin = 15) {
  if (!provider || !connections?.length) return null;

  const classified = classifyConnections(connections);
  const { available, permanentlyDown } = classified;

  if (available > 0) return null;
  if (permanentlyDown === 0) return null;

  const lastAlert = debounceMap.get(provider);
  if (lastAlert && Date.now() - lastAlert < cooldownMin * 60000) return null;

  debounceMap.set(provider, Date.now());
  allDownState.set(provider, true);

  return { shouldAlert: true, downCount: permanentlyDown, totalCount: connections.length, errors: classified.errors };
}

export function checkRecovery(provider, connections) {
  if (!provider || !connections?.length) return null;
  if (!allDownState.get(provider)) return null;

  const available = connections.filter(c => {
    if (c.isActive === 0) return false;
    if (hasActiveModelLock(c)) return false;
    if (c.testStatus === "unavailable" && PERMANENT_ERROR_CODES.has(c.errorCode)) return false;
    return c.testStatus !== "unavailable";
  }).length;

  if (available > 0) {
    allDownState.set(provider, false);
    return { recovered: true, availableCount: available, totalCount: connections.length };
  }
  return null;
}

export function formatAlertMessage(provider, downCount, totalCount, errors = []) {
  const errorText = errors.map(e => `${e.name}: ${e.code ? `${e.code} ` : ""}${e.error}`).join("\n") || "N/A";
  return {
    embeds: [{
      title: `Provider Down: ${provider}`,
      description: `All ${totalCount} accounts have permanent failures.`,
      color: 15158332,
      fields: [
        { name: "Accounts", value: `0/${totalCount} available`, inline: true },
        { name: "Errors", value: errorText.slice(0, 1024) }
      ],
      timestamp: new Date().toISOString()
    }]
  };
}

export function formatRecoveryMessage(provider, availableCount, totalCount) {
  return {
    embeds: [{
      title: `Provider Recovered: ${provider}`,
      description: "Provider has available accounts again.",
      color: 3066993,
      fields: [
        { name: "Available", value: `${availableCount}/${totalCount} accounts`, inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };
}

export function setLastAlertTime(provider, timestamp) {
  debounceMap.set(provider, timestamp);
}

export function getLastAlertTime(provider) {
  return debounceMap.get(provider) || null;
}
