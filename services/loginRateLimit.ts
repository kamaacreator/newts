export type LoginAttemptState = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
};

export type LoginRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_TRACKED_KEYS = 10_000;
const attempts = new Map<string, LoginAttemptState>();

/**
 * Process-local failed-login limiter. Deployments with multiple server instances
 * must replace this with a shared rate-limit store before scaling horizontally.
 */
export function checkLoginRateLimit(key: string, nowMs = Date.now()): LoginRateLimitDecision {
  const normalizedKey = key.slice(0, 256) || 'unknown';
  let state = attempts.get(normalizedKey);

  if (state && nowMs - state.windowStartedAt >= WINDOW_MS && nowMs >= state.blockedUntil) {
    attempts.delete(normalizedKey);
    state = undefined;
  }

  if (state && state.blockedUntil > nowMs) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - nowMs) / 1000)),
      remainingAttempts: 0,
    };
  }

  if (!state) {
    if (attempts.size >= MAX_TRACKED_KEYS) {
      for (const [existingKey, existingState] of attempts) {
        if (nowMs - existingState.windowStartedAt >= WINDOW_MS && nowMs >= existingState.blockedUntil) {
          attempts.delete(existingKey);
        }
      }
      if (attempts.size >= MAX_TRACKED_KEYS) {
        const oldestKey = attempts.keys().next().value;
        if (oldestKey !== undefined) attempts.delete(oldestKey);
      }
    }
    state = { failures: 0, windowStartedAt: nowMs, blockedUntil: 0 };
    attempts.set(normalizedKey, state);
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_FAILURES - state.failures),
  };
}

export function recordFailedLogin(key: string, nowMs = Date.now()): LoginRateLimitDecision {
  const normalizedKey = key.slice(0, 256) || 'unknown';
  let state = attempts.get(normalizedKey);

  if (!state || nowMs - state.windowStartedAt >= WINDOW_MS) {
    state = { failures: 0, windowStartedAt: nowMs, blockedUntil: 0 };
  }

  state.failures += 1;
  if (state.failures >= MAX_FAILURES) state.blockedUntil = nowMs + WINDOW_MS;
  attempts.set(normalizedKey, state);

  return checkLoginRateLimit(normalizedKey, nowMs);
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key.slice(0, 256) || 'unknown');
}

/** Test-only reset to ensure deterministic isolation across test cases. */
export function resetLoginRateLimitForTests(): void {
  attempts.clear();
}
