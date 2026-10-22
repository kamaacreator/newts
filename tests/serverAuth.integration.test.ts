import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resetLoginRateLimitForTests } from '../services/loginRateLimit.ts';

// Set the production configuration before importing server.ts, whose auth config
// is intentionally captured once at process start.
process.env.NODE_ENV = 'production';
process.env.AETHERIS_USERNAME = 'integration-operator';
process.env.AETHERIS_PASSWORD = 'test-only-password-not-for-deployment';
process.env.AETHERIS_SESSION_SECRET = 'integration-test-secret-0123456789abcdef0123456789';
process.env.AETHERIS_TRUST_PROXY_HOPS = '0';
const originalCwd = process.cwd();
const isolatedStorageDir = mkdtempSync(join(tmpdir(), 'aetheris-auth-test-'));
process.chdir(isolatedStorageDir);

const { app } = await import('../server.ts');
const server = createServer(app);
await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Test HTTP server did not bind to a TCP port');
const baseUrl = `http://127.0.0.1:${address.port}`;

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  process.chdir(originalCwd);
  rmSync(isolatedStorageDir, { recursive: true, force: true });
});

async function login(username = process.env.AETHERIS_USERNAME!, password = process.env.AETHERIS_PASSWORD!) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

test('production API denies protected mutation without a session', async () => {
  const response = await fetch(`${baseUrl}/api/agent/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRunning: false }),
  });
  assert.equal(response.status, 401);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
});

test('login cookie authenticates and logout revokes the same session', async () => {
  resetLoginRateLimitForTests();
  const loginResponse = await login();
  assert.equal(loginResponse.status, 200);
  assert.match(loginResponse.headers.get('cache-control') ?? '', /no-store/);
  const setCookie = loginResponse.headers.get('set-cookie');
  assert.ok(setCookie, 'login should issue a session cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  const cookie = setCookie.split(';')[0];

  const beforeLogout = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
  assert.equal((await beforeLogout.json() as { authenticated: boolean }).authenticated, true);

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  assert.equal(logoutResponse.status, 200);

  const afterLogout = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
  assert.equal((await afterLogout.json() as { authenticated: boolean }).authenticated, false);
});

test('fifth failed login is throttled and includes Retry-After', async () => {
  resetLoginRateLimitForTests();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await login('integration-operator', 'wrong-password');
    assert.equal(response.status, 401);
  }
  const blocked = await login('integration-operator', 'wrong-password');
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

test('malformed percent-encoding in a cookie does not crash the auth endpoint', async () => {
  const response = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: 'aetheris_session=%ZZ' },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { authenticated: boolean }).authenticated, false);
});


test('illustrative protein formula is not allowed to mutate engine scientific metrics', async () => {
  resetLoginRateLimitForTests();
  const loginResponse = await login();
  assert.equal(loginResponse.status, 200);
  const cookie = (loginResponse.headers.get('set-cookie') ?? '').split(';')[0];
  assert.ok(cookie);

  const response = await fetch(`${baseUrl}/api/agent/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ command: 'protein folding' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json() as {
    finalResult: { resultClass?: string; method?: string };
    engine: { entities: Array<{ id: string; metrics: { gibbsFreeEnergy: number } }>; logs: string[] };
  };
  assert.equal(body.finalResult.resultClass, 'illustrative');
  assert.equal(body.finalResult.method, 'legacy-formula-illustration-v0');
  const p53 = body.engine.entities.find((entity) => entity.id === 'p53-sovereign');
  assert.ok(p53);
  assert.equal(p53.metrics.gibbsFreeEnergy, -7.5);
  assert.ok(body.engine.logs.some((line) => line.includes('[RESULT] illustrative result produced')));
});
