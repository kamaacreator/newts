# Protein folding provider contract

## Status

The application now has a provider adapter and an authenticated endpoint at `POST /api/agent/protein/fold`. It does **not** select a provider by default. Until a compatible provider is configured, the endpoint returns HTTP 503 and does not generate a heuristic or synthetic fold.

This is an integration boundary, not proof that a model has been deployed or scientifically validated.

## Provider interface

Configure these deployment environment variables:

- `AETHERIS_FOLDING_ENDPOINT`: HTTPS endpoint for an approved, ESMFold-compatible inference service.
- `AETHERIS_FOLDING_MODEL_ID`: exact model identifier and version, recorded with each result.
- `AETHERIS_FOLDING_PROVIDER`: human-readable provider name.
- `AETHERIS_FOLDING_API_KEY`: optional bearer token for the provider, stored as a deployment secret.

The endpoint contract is:
- Request: `POST`, `Content-Type: text/plain; charset=utf-8`, body is the normalized amino-acid sequence.
- Response: HTTP 200 with a legacy PDB text body.
- A single chain must be present, with one C-alpha coordinate for every submitted residue, in the same sequence order and with exactly matching residue identities.
- Response body must be at most 2 MB.

Production requires HTTPS. HTTP is permitted only for loopback endpoints in non-production mode. Redirects are rejected to prevent forwarding sequence data to an unexpected destination. The request timeout is three minutes. The sequence limit is 768 standard amino-acid residues for this adapter version.

## API result and provenance

The response records provider, model identifier, sequence length, C-alpha residue count, SHA-256 of the returned PDB, method identifier, and C-alpha geometry metrics. It does not infer experimental validity or confidence. A PDB returned by a model is a **prediction**, not an experimentally determined structure.

Provider errors are explicit: missing configuration returns 503; invalid sequence returns 400; upstream failure returns 502; timeout returns 504; invalid output returns 502. There is no silent fallback to the old heuristic branch.

## Data handling and release gates

The configured provider receives the submitted sequence. Only configure a service after reviewing its privacy terms, retention, access controls, availability, and model license. Do not submit sensitive or restricted sequences without authorization.

Before enabling this for general use:
1. Configure a specific provider and model version in the target deployment.
2. Run an end-to-end inference against a known sequence and verify output hash, sequence correspondence, and PDB parsing.
3. Compare a curated evaluation set with experimental structures using predeclared metrics and a documented split.
4. Validate model confidence fields separately; this adapter deliberately reports none.
5. Perform API integration tests, load/timeout tests, deployment security review, and scientific review.

The older ESM Atlas folding endpoint is not selected as a default because the available official repository documentation describes the service, but a historical service discussion reports reliability problems. A deployment must choose and verify its own provider.
