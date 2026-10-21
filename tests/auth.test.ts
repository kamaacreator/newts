import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authIsConfigured,
  createSessionToken,
  verifyCredentials,
  verifySessionToken,
} from '../services/auth.ts';

const config = {
  username: 'engine-operator',
  password: 'example-password-for-unit-tests',
  sessionSecret: '0123456789abcdef0123456789abcdef',
};

test('auth configuration requires credentials and a 32-character session secret', () => {
  assert.equal(authIsConfigured(config), true);
  assert.equal(authIsConfigured({ ...config, sessionSecret: 'short' }), false);
});

test('credentials are verified without accepting missing or mismatched values', () => {
  assert.equal(verifyCredentials(config.username, config.password, config), true);
  assert.equal(verifyCredentials(config.username, 'wrong', config), false);
  assert.equal(verifyCredentials(undefined, config.password, config), false);
});

test('session token verifies, expires, and rejects tampering', () => {
  const now = 1_800_000_000_000;
  const token = createSessionToken(config, now);
  assert.equal(verifySessionToken(token, config, now), true);
  assert.equal(verifySessionToken(token, config, now + 9 * 60 * 60 * 1000), false);
  assert.equal(verifySessionToken(token + 'x', config, now), false);
  assert.equal(verifySessionToken('invalid', config, now), false);
});
