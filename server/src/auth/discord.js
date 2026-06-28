import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

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
  passport.deserializeUser((id, done) => {
    if (typeof id === 'string' && id.startsWith('dev-')) {
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
