const DISCORD_TIMEOUT_MS = 5000;

export async function sendDiscordAlert(webhookUrl, payload) {
  if (!webhookUrl || !payload) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS)
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      const retry = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS)
      });
      if (!retry.ok) {
        console.error(`[ProviderAlert] Discord webhook retry failed: ${retry.status}`);
        return false;
      }
      return true;
    }

    if (!response.ok) {
      console.error(`[ProviderAlert] Discord webhook error: ${response.status}`);
      return false;
    }

    return true;
  } catch (err) {
    if (err.name === "TimeoutError") {
      console.error(`[ProviderAlert] Discord webhook timeout (${DISCORD_TIMEOUT_MS}ms)`);
    } else {
      console.error(`[ProviderAlert] Discord webhook error:`, err.message);
    }
    return false;
  }
}
