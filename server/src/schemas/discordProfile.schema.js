import { z } from 'zod';

// #699 — Discord OAuth profile shape, as passed to discord.js's DiscordStrategy verify callback.
// Validated before reaching upsertUser() so a malformed profile (unexpected shape from an
// upstream passport-discord/Discord API change) surfaces as a typed auth failure rather than a
// raw SQLite error from an unexpected value hitting a NOT NULL column.
//
// #700 review, second pass:
// - `id` is a Discord snowflake (numeric string) — constraining the shape also structurally
//   separates it from the `dev-` prefix namespace deserializeUser() reserves for synthetic
//   dev-mode identities (discord.js), so a real profile could never collide with that namespace.
//   Dev-mode identities never pass through this schema at all (constructed directly in
//   deserializeUser, not via the OAuth verify callback this schema guards).
// - `username` is bounded (Discord's own max is 32, but display names/globalName can be longer;
//   64 is a generous ceiling against an unbounded value reaching the database).
// - `avatar` is NOT `.optional()` — discord.js's sole call site always passes `profile.avatar ??
//   null` explicitly, so "field absent entirely" is a shape this schema will never actually see;
//   marking it optional would validate a case that can't occur.
export const DiscordProfileSchema = z.object({
  id: z.string().regex(/^\d{1,20}$/, 'must be a Discord snowflake (numeric string)'),
  username: z.string().min(1).max(64),
  avatar: z.string().nullable(),
});
