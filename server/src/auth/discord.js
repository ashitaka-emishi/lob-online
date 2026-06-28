import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

// Serialize only the user id into the session; deserialize restores the full user object.
// Phase 1: full user object is stored in the session directly (no DB lookup yet).
// Phase 2 will replace deserializeUser with a DB read from the users table.
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configure the Discord OAuth2 strategy.
// Phase 1: verify callback stores user in session without a DB upsert.
// Phase 2 will add the users-table upsert inside the verify callback.
export function configurePassport() {
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
        done(null, user);
      }
    )
  );

  console.log('[auth] Discord OAuth strategy configured');
}

export default passport;
