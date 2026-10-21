import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type AuthConfig = {
  username?: string;
  password?: string;
  sessionSecret?: string;
};

const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_ACTIVE_SESSIONS = 10_000;
const activeSessions = new Map<string, number>();

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function authIsConfigured(config: AuthConfig): boolean {
  return Boolean(config.username && config.password && config.sessionSecret && config.sessionSecret.length >= 32);
}

export function verifyCredentials(username: unknown, password: unknown, config: AuthConfig): boolean {
  if (!authIsConfigured(config) || typeof username !== 'string' || typeof password !== 'string') return false;
  return constantTimeEqual(username, config.username!) && constantTimeEqual(password, config.password!);
}

function signSession(expiresAt: string, sessionId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${expiresAt}.${sessionId}`).digest('base64url');
}

function pruneExpiredSessions(nowSeconds: number): void {
  for (const [sessionId, expiresAt] of activeSessions) {
    if (expiresAt <= nowSeconds) activeSessions.delete(sessionId);
  }
}

export function createSessionToken(config: AuthConfig, nowMs = Date.now()): string {
  if (!authIsConfigured(config)) throw new Error('Authentication is not configured');
  const nowSeconds = Math.floor(nowMs / 1000);
  pruneExpiredSessions(nowSeconds);
  if (activeSessions.size >= MAX_ACTIVE_SESSIONS) {
    const oldestSessionId = activeSessions.keys().next().value;
    if (oldestSessionId !== undefined) activeSessions.delete(oldestSessionId);
  }

  const expiresAt = String(nowSeconds + SESSION_TTL_SECONDS);
  const sessionId = randomBytes(16).toString('base64url');
  activeSessions.set(sessionId, Number(expiresAt));
  return `${expiresAt}.${sessionId}.${signSession(expiresAt, sessionId, config.sessionSecret!)}`;
}

export function verifySessionToken(token: unknown, config: AuthConfig, nowMs = Date.now()): boolean {
  if (!authIsConfigured(config) || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expiresAt, sessionId, signature] = parts;
  if (!/^\d{10,}$/.test(expiresAt) || !/^[A-Za-z0-9_-]{20,}$/.test(sessionId)) return false;
  const expiresAtSeconds = Number(expiresAt);
  if (expiresAtSeconds <= Math.floor(nowMs / 1000)) return false;
  if (activeSessions.get(sessionId) !== expiresAtSeconds) return false;
  return constantTimeEqual(signature, signSession(expiresAt, sessionId, config.sessionSecret!));
}

export function revokeSessionToken(token: unknown, config: AuthConfig): void {
  if (!verifySessionToken(token, config)) return;
  const parts = (token as string).split('.');
  activeSessions.delete(parts[1]);
}

export const SESSION_TTL_SECONDS_FOR_COOKIE = SESSION_TTL_SECONDS;
