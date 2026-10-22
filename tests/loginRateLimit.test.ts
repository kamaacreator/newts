import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordFailedLogin,
  resetLoginRateLimitForTests,
} from '../services/loginRateLimit.ts';

test('allows limited attempts and blocks after five failures', () => {
  resetLoginRateLimitForTests();
  const key = '192.0.2.10';
  const start = 1_800_000_000_000;
  assert.equal(checkLoginRateLimit(key, start).allowed, true);
  for (let i = 1; i <= 4; i += 1) {
    assert.equal(recordFailedLogin(key, start + i * 1000).allowed, true);
  }
  const blocked = recordFailedLogin(key, start + 5000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  assert.equal(checkLoginRateLimit(key, start + 6000).allowed, false);
});

test('expires the block after the window and allows a fresh attempt', () => {
  resetLoginRateLimitForTests();
  const key = '192.0.2.11';
  const start = 1_800_000_000_000;
  for (let i = 0; i < 5; i += 1) recordFailedLogin(key, start + i * 1000);
  assert.equal(checkLoginRateLimit(key, start + 16 * 60 * 1000).allowed, true);
});

test('successful login reset removes the failed-attempt counter', () => {
  resetLoginRateLimitForTests();
  const key = '192.0.2.12';
  const start = 1_800_000_000_000;
  recordFailedLogin(key, start);
  recordFailedLogin(key, start + 1000);
  clearLoginFailures(key);
  assert.equal(checkLoginRateLimit(key, start + 2000).remainingAttempts, 5);
});
