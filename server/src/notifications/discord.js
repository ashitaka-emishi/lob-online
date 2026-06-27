// Discord webhook notifications — fire-and-forget, never blocks the action pipeline.
// DISCORD_WEBHOOK_URL overrides the stored URL in non-production environments only.

const ALLOWED_DISCORD_HOSTS = new Set([
  'discord.com',
  'discordapp.com',
  'ptb.discord.com',
  'canary.discord.com',
]);

/** Re-validate a webhook URL against the Discord allowlist (shared with the create route). */
export function isAllowedDiscordWebhook(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_DISCORD_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

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
    // Suppress @everyone/@here/@role injection regardless of field contents.
    allowed_mentions: { parse: [] },
  };
}

/**
 * POST payload to the Discord webhook URL (or DISCORD_WEBHOOK_URL override).
 * Swallows all errors — never throws, never blocks the caller.
 *
 * @param {string} url  — discord_webhook value from the game row
 * @param {object} payload
 */
export async function notifyWebhook(url, payload) {
  // Re-validate the stored webhook URL at egress — defense in depth against corrupted DB data (#651).
  if (!isAllowedDiscordWebhook(url)) {
    console.warn('[discord] webhook URL failed allowlist check — skipping notification');
    return;
  }

  // DISCORD_WEBHOOK_URL is honoured only outside production to prevent accidental
  // exfiltration if the variable leaks into a production environment (#650).
  // Read at call time (not module init) so runtime NODE_ENV changes take effect.
  const override =
    process.env.NODE_ENV !== 'production' ? process.env.DISCORD_WEBHOOK_URL : undefined;
  const target = override || url;

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
