import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

// DEPENDENCY RISK: passport-discord@0.1.4 is deprecated upstream ("no longer maintained",
// confirmed via `npm view passport-discord deprecated`). It's a ~150-line shim over the
// actively-maintained passport-oauth2 — all security-relevant logic (token exchange, state
// store) lives in the parent package. Migration path if this ever needs replacing: a
// maintained fork, or an inline passport-oauth2 strategy against Discord's endpoints
// (~20 lines). Tracked in #698.

// Configure passport with a live DB reference. Called once from server.js after initDb().
// Hoists all prepared statements at call time so per-request paths hit no extra SQLite overhead.
export function configurePassport(db) {
  const getUserStmt = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?');
  const upsertUserStmt = db.prepare(
    'INSERT INTO users (id, username, avatar, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar'
  );

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
      const user = getUserStmt.get(id);
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
        const user = {
          id: profile.id,
          username: profile.username,
          avatar: profile.avatar ?? null,
        };
        try {
          upsertUserStmt.run(user.id, user.username, user.avatar, Date.now());
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
