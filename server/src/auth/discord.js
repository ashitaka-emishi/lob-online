import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

import { DiscordProfileSchema } from '../schemas/discordProfile.schema.js';
import { createUserQueries } from '../store/gameSqlite.js';

// DEPENDENCY RISK: passport-discord@0.1.4 is deprecated upstream ("no longer maintained",
// confirmed via `npm view passport-discord deprecated`). It's a ~150-line shim over the
// actively-maintained passport-oauth2 — all security-relevant logic (token exchange, state
// store) lives in the parent package. Migration path if this ever needs replacing: a
// maintained fork, or an inline passport-oauth2 strategy against Discord's endpoints
// (~20 lines). Tracked in #698.

// Configure passport with a live DB reference. Called once from server.js after initDb().
// Hoists all prepared statements at call time so per-request paths hit no extra SQLite overhead.
export function configurePassport(db) {
  // #698 — was a byte-identical duplicate of gameSqlite.js's own upsertUser/getUser prepared
  // statements; a future users-table schema change only had to be applied there, but nothing
  // enforced it, and this copy had no coverage of its own. Shared factory now used by both.
  const { getUser, upsertUser } = createUserQueries(db);

  // #698 — passport.serializeUser()/deserializeUser() push onto internal arrays
  // (_serializers/_deserializers, authenticator.js) rather than replacing; passport's public
  // API has no "reset" call. A second configurePassport() in the same process (multi-init test
  // contexts, a future hot-restart pattern) would otherwise leave the FIRST-registered
  // deserializer permanently in effect — deserializeUser tries stack[0] first and only falls
  // through on an explicit 'pass', which this deserializer never returns — silently keeping a
  // stale handler bound to a closed DB instance active for the rest of the process. Resetting
  // here makes configurePassport() safe to call more than once; passport.use() below doesn't
  // need the same treatment since strategies are keyed by name (an object, not an array) and
  // re-registering 'discord' naturally replaces the prior entry.
  //
  // #700 review, second pass — two things worth being explicit about:
  // 1. This wipes the WHOLE passport singleton's serializer/deserializer stack, not just
  //    entries registered by this module — safe only as long as configurePassport() remains the
  //    sole registrar of passport.serializeUser/deserializeUser in this codebase (true today; a
  //    future second auth source registering before this runs would be silently dropped).
  // 2. `_serializers`/`_deserializers` are undocumented, underscore-prefixed passport internals
  //    (not covered by its semver guarantee) — a passport version bump could rename or
  //    restructure them, silently turning this reset into a no-op. Guard the shape so that
  //    fails loudly instead.
  if (!Array.isArray(passport._serializers) || !Array.isArray(passport._deserializers)) {
    throw new Error(
      "[discord] passport._serializers/_deserializers are not arrays — passport internals changed shape; configurePassport()'s idempotency reset (#698) needs updating for this passport version."
    );
  }
  passport._serializers = [];
  passport._deserializers = [];

  // Serialize only the user id into the session.
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize: look up the full user row from the DB.
  // Dev-mode synthetic users (id prefix "dev-") are reconstituted without a DB hit so
  // local testing works without real Discord credentials or DB-persisted users.
  // /team-review — this branch must re-check AUTH_DEV_MODE at deserialize time, not just at
  // mount time (server.js gates *minting* a dev- session behind the flag, but a session
  // cookie already minted while the flag was on would otherwise keep deserializing into a
  // valid identity for its full session lifetime even after the flag is turned back off).
  passport.deserializeUser((id, done) => {
    if (typeof id === 'string' && id.startsWith('dev-')) {
      if (process.env.AUTH_DEV_MODE !== 'true') return done(null, false);
      const code = id.slice(4);
      return done(null, { id, username: `DevUser ${code}`, avatar: null });
    }
    try {
      const user = getUser(id);
      done(null, user ?? false);
    } catch (err) {
      done(err);
    }
  });

  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_CALLBACK_URL } = process.env;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_CALLBACK_URL) {
    console.warn(
      '[auth] Discord OAuth env vars not set — /auth/discord routes will be unavailable'
    );
    return;
  }

  passport.use(
    new DiscordStrategy(
      {
        clientID: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        callbackURL: DISCORD_CALLBACK_URL,
        scope: ['identify'],
        // /team-review (security) — without this, passport-oauth2 falls back to a NullStore
        // whose verify() unconditionally returns true, i.e. no CSRF protection on the OAuth
        // handshake at all (login CSRF, CWE-352): an attacker can start their own auth flow,
        // capture their own single-use code, and get a victim to hit the callback URL with
        // it, logging the victim in as the attacker. state: true uses the already-mounted
        // express-session to bind the authorize redirect to the callback.
        state: true,
      },
      (_accessToken, _refreshToken, profile, done) => {
        // #699 — validate the profile shape before it reaches upsertUser(), so a malformed
        // profile (an unexpected shape from an upstream passport-discord/Discord API change)
        // surfaces as a typed auth failure instead of a raw SQLite error from an unexpected
        // value hitting a NOT NULL column.
        const parsed = DiscordProfileSchema.safeParse({
          id: profile.id,
          username: profile.username,
          avatar: profile.avatar ?? null,
        });
        if (!parsed.success) {
          return done(new Error(`Invalid Discord profile: ${parsed.error.message}`));
        }
        const user = parsed.data;
        try {
          upsertUser(user.id, user.username, user.avatar);
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  console.log('[auth] Discord OAuth strategy configured');
}

export default passport;
