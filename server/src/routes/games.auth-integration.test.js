/**
 * Real end-to-end auth-lifecycle integration test (#m9-discord-oauth review finding).
 *
 * Unlike games.test.js (which stubs req.session/req.user/req.login directly), this wires a
 * real express-session, real passport.initialize()/passport.session(), a real in-memory
 * SQLite DB (exercising the actual v0->v2 migration), and the real auth.js/devAuth.js/games.js
 * routers — driven through a cookie-persisting supertest agent. Only the Spaces (S3)
 * persistence layer and Discord webhook notifications are mocked, since they are external
 * network dependencies with no bearing on the auth/session lifecycle under test.
 *
 * This is the test that would have caught the original regenerate()-drops-login bug directly
 * (games.test.js's mocked req.login stub could not have): it observes real passport session
 * state across multiple HTTP requests through a real cookie jar, not a spied-on function call.
 */
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../store/spaces.js', () => ({
  saveGame: vi.fn().mockResolvedValue(undefined),
  loadGame: vi.fn(),
  appendHistory: vi.fn().mockResolvedValue(undefined),
  deleteGameState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../notifications/discord.js', () => ({
  buildActionPayload: vi.fn().mockReturnValue({ content: 'test' }),
  notifyWebhook: vi.fn().mockResolvedValue(undefined),
  isAllowedDiscordWebhook: vi.fn().mockReturnValue(true),
}));

import { configurePassport } from '../auth/discord.js';
import { requireAuth } from '../auth/requireAuth.js';
import { initDb } from '../store/gameSqlite.js';
import authRouter from './auth.js';
import devAuthRouter from './devAuth.js';
import gamesRouter from './games.js';

let app;

beforeAll(() => {
  // dev- prefixed identities only deserialize when this is true (discord.js — closes the
  // stale-dev-session gap found in review); this suite intentionally exercises that path.
  process.env.AUTH_DEV_MODE = 'true';

  const db = initDb(':memory:'); // runs the real v0->v2 migration
  configurePassport(db); // registers real serializeUser/deserializeUser once for this file

  app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true, sameSite: 'lax' },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  // Mirrors server.js's CSRF defense (Origin check on state-mutating requests) so this
  // integration test's app shape matches the real middleware stack, not just a subset of it.
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('Origin');
      if (origin && origin !== 'http://localhost:5173') {
        return res.status(403).json({ error: 'Forbidden: cross-origin request blocked' });
      }
    }
    next();
  });
  app.use('/auth', authRouter);
  app.use('/auth/dev', devAuthRouter);
  app.use('/api/v1/games', requireAuth, gamesRouter);
});

// Extracts the connect.sid value from a supertest response's Set-Cookie header (express-session's
// default cookie name; the beforeAll session() config above doesn't override it).
function sessionId(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  const raw = setCookie.find((c) => c.startsWith('connect.sid='));
  return raw ? raw.split(';')[0] : null;
}

describe('auth lifecycle — real session/passport, no mocked req.login (#m9-discord-oauth)', () => {
  it('rejects unauthenticated requests to /api/v1/games', async () => {
    const res = await request(app).get('/api/v1/games');
    expect(res.status).toBe(401);
  });

  // #698 review, second pass — mutation-testing regenerateSession() to a full no-op (neither
  // req.session.regenerate() nor req.login() called) surfaced that no existing test in this
  // suite would have caught it: every "stays logged in" assertion below trivially holds if the
  // session is never touched at all, since nothing wipes req.user in the first place. This test
  // exists specifically to verify the SEC-M1 property those tests can't: that the session ID
  // actually rotates on create, independent of whether identity happens to survive.
  it('rotates the session ID on create (SEC-M1 session-fixation defense)', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post('/auth/dev/login').send({ code: 'itest-rotate' }).expect(200);
    const sidBefore = sessionId(loginRes);
    expect(sidBefore).toBeTruthy();

    const createRes = await agent.post('/api/v1/games').send({}).expect(201);
    const sidAfter = sessionId(createRes);
    expect(sidAfter).toBeTruthy();
    expect(sidAfter).not.toBe(sidBefore);
  });

  it("login -> create game -> stays logged in -> game appears in the user's list", async () => {
    const agent = request.agent(app);

    await agent.post('/auth/dev/login').send({ code: 'itest-1' }).expect(200);
    await agent.get('/auth/me').expect(200);

    const createRes = await agent.post('/api/v1/games').send({});
    expect(createRes.status).toBe(201);
    const gameId = createRes.body.id;

    // The regression this test exists to catch: session.regenerate() (SEC-M1) wiping
    // passport's serialized identity along with the sideToken rotation it was meant to guard.
    await agent.get('/auth/me').expect(200);

    const listRes = await agent.get('/api/v1/games');
    expect(listRes.status).toBe(200);
    expect(listRes.body.map((g) => g.id)).toContain(gameId);
  });

  it('login -> create -> logout -> rejoin is rejected, not silently allowed via a stale session', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/dev/login').send({ code: 'itest-2' }).expect(200);
    const { body: game } = await agent.post('/api/v1/games').send({}).expect(201);

    await agent.post('/auth/logout').expect(200);
    await agent.get('/auth/me').expect(401);

    // No session at all now — the create-game route itself requires auth.
    const res = await agent.post(`/api/v1/games/${game.id}/join`).send({ side: 'confederate' });
    expect(res.status).toBe(401);
  });

  it('login -> create -> logout -> log back in as the SAME identity -> reclaims the side', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/dev/login').send({ code: 'itest-3' }).expect(200);
    const { body: game } = await agent.post('/api/v1/games').send({}).expect(201);

    await agent.post('/auth/logout').expect(200);
    await agent.post('/auth/dev/login').send({ code: 'itest-3' }).expect(200); // same identity

    const res = await agent.post(`/api/v1/games/${game.id}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: game.id, side: 'union' });

    await agent.get('/auth/me').expect(200);
  });

  it('two different logged-in users each create a game and only see their own in the list', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);

    await agentA.post('/auth/dev/login').send({ code: 'itest-a' }).expect(200);
    await agentB.post('/auth/dev/login').send({ code: 'itest-b' }).expect(200);

    const { body: gameA } = await agentA.post('/api/v1/games').send({}).expect(201);
    const { body: gameB } = await agentB.post('/api/v1/games').send({}).expect(201);

    const listA = await agentA.get('/api/v1/games').expect(200);
    const listB = await agentB.get('/api/v1/games').expect(200);

    expect(listA.body.map((g) => g.id)).toContain(gameA.id);
    expect(listA.body.map((g) => g.id)).not.toContain(gameB.id);
    expect(listB.body.map((g) => g.id)).toContain(gameB.id);
    expect(listB.body.map((g) => g.id)).not.toContain(gameA.id);
  });

  it('login -> create -> join as a second user -> both stay logged in', async () => {
    const creator = request.agent(app);
    const joiner = request.agent(app);

    await creator.post('/auth/dev/login').send({ code: 'itest-c1' }).expect(200);
    const { body: game } = await creator.post('/api/v1/games').send({}).expect(201);

    await joiner.post('/auth/dev/login').send({ code: 'itest-c2' }).expect(200);
    const joinRes = await joiner
      .post(`/api/v1/games/${game.id}/join`)
      .send({ side: 'confederate' });
    expect(joinRes.status).toBe(200);

    await creator.get('/auth/me').expect(200);
    await joiner.get('/auth/me').expect(200);
  });
});
