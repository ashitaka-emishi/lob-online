import { z } from 'zod';

// #699 — Discord OAuth profile shape, as passed to discord.js's DiscordStrategy verify callback.
// Validated before reaching upsertUser() so a malformed profile (unexpected shape from an
// upstream passport-discord/Discord API change) surfaces as a typed auth failure rather than a
// raw SQLite error from an unexpected value hitting a NOT NULL column.
export const DiscordProfileSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  avatar: z.string().nullable().optional(),
});
