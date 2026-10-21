# Production authentication and deployment safety

Production mode is selected by `NODE_ENV=production`. In production, every `/api/agent/*` route requires a valid signed session cookie. The API fails closed if credentials or a sufficiently strong session secret are missing.

Configure these environment variables in the deployment platform's secret/environment settings (do not commit real values):

- `NODE_ENV=production`
- `AETHERIS_USERNAME`: operator login name
- `AETHERIS_PASSWORD`: a unique, high-entropy password
- `AETHERIS_SESSION_SECRET`: at least 32 random characters; generate with `openssl rand -base64 48`

After setting them, redeploy and verify:
1. `GET /api/auth/session` returns `authenticated: false` before login.
2. `POST /api/agent/telemetry` without a session returns HTTP 401.
3. Invalid credentials return HTTP 401.
4. Valid credentials set an HttpOnly, SameSite=Strict cookie; in production it is Secure.
5. An authenticated session expires after eight hours.
6. Missing auth configuration returns HTTP 503 for protected APIs instead of allowing unauthenticated writes.

Development mode bypasses login for local development only. Do not deploy with `NODE_ENV` unset or set to a non-production value on an internet-facing server.

## Remaining hardening work

Failed login attempts are now rate-limited per observed client IP: five failures trigger a 15-minute block. The limiter is process-local and bounded; use a shared store and validate trusted-proxy configuration before running multiple instances. This first authentication layer is still single-operator and stateless. Before a multi-user or regulated deployment, add account lifecycle management, password hashing backed by a user store, audit events, secret rotation and revocation, CSRF integration tests, session revocation, and deployment-specific reverse-proxy validation. Run an external security review before production release.

## Repository-history caution

The runtime JSON file was removed from the current branch and added to `.gitignore`. This does not remove earlier versions from Git history. Because the repository is public, inspect historical copies for private conversation content or secrets. If sensitive material is present, coordinate a history rewrite and rotate any exposed credentials; deleting a file in a later commit is not equivalent to erasing it from repository history.
