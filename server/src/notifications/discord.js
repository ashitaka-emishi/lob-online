// Discord webhook notifications — fire-and-forget, never blocks the action pipeline.
// DISCORD_WEBHOOK_TEST_URL overrides the stored URL for local dev / CI.

/**
 * Build the webhook POST body for a completed game action.
 * Simple content string; no embeds required for MVP.
 *
 * @param {string} gameId
 * @param {{type: string}} action
 * @param {{turn: number, activePlayer: string|null}} state
 * @returns {object} Discord webhook payload
 */
export function buildActionPayload(gameId, action, state) {
  const side = state.activePlayer ?? 'unknown';
  return {
    content: `[lob-online] game \`${gameId}\` — \`${action.type}\` played by **${side}** (turn ${state.turn ?? '?'})`,
  };
}

/**
 * POST payload to the Discord webhook URL (or DISCORD_WEBHOOK_TEST_URL override).
 * Swallows all errors — never throws, never blocks the caller.
 *
 * @param {string} url  — discord_webhook value from the game row
 * @param {object} payload
 */
export async function notifyWebhook(url, payload) {
  const target = process.env.DISCORD_WEBHOOK_TEST_URL || url;
  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[discord] webhook returned ${res.status} for game notification`);
    }
  } catch (err) {
    console.warn(`[discord] webhook failed: ${err.message}`);
  }
}
