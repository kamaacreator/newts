import { createHmac, timingSafeEqual } from 'node:crypto';

export type AuthConfig = {
  username?: string;
  password?: string;
  sessionSecret?: string;
};

const SESSION_TTL_SECONDS = 8 * 60 * 60;

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

function signExpiry(expiresAt: string, secret: string): string {
  return createHmac('sha256', secret).update(expiresAt).digest('base64url');
}

export function createSessionToken(config: AuthConfig, nowMs = Date.now()): string {
  if (!authIsConfigured(config)) throw new Error('Authentication is not configured');
  const expiresAt = String(Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS);
  return `${expiresAt}.${signExpiry(expiresAt, config.sessionSecret!)}`;
}

export function verifySessionToken(token: unknown, config: AuthConfig, nowMs = Date.now()): boolean {
  if (!authIsConfigured(config) || typeof token !== 'string') return false;
  const separator = token.indexOf('.');
  if (separator <= 0) return false;
  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d{10,}$/.test(expiresAt) || Number(expiresAt) <= Math.floor(nowMs / 1000)) return false;
  return constantTimeEqual(signature, signExpiry(expiresAt, config.sessionSecret!));
}

export const SESSION_TTL_SECONDS_FOR_COOKIE = SESSION_TTL_SECONDS;
