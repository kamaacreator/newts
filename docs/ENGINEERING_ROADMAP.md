# Engine Build and Validation Roadmap

## Mission

Evolve Aetheris from a scientific-intelligence console and deterministic prototype into a reproducible, testable scientific-computing platform. The platform may only claim capabilities that are implemented, measured, and supported by reproducible evidence.

This roadmap is intentionally gated. Passing software CI is not scientific approval, and a polished UI is not evidence of a valid scientific result.

## Current baseline

Reviewed source baseline: `main` at `6393f7116328be10e8a2afff16ef6b467d59ee93` (2026-10-21).

The current calculation service returns deterministic, formula-based outputs for several domains. The protein branch uses a fixed residue count and simplified energy-like terms; its RMSD is selected by thresholds rather than calculated from molecular coordinates. The server's execution loop advances named modes and logs messages; it does not implement the scientific operations implied by those mode names. Other domains similarly use simplified equations and constants rather than the full numerical methods described in output text.

Treat existing scientific outputs as **unvalidated estimates / illustrative prototype output** until each has a documented derivation and independent verification. Existing stored histories may contain earlier unvalidated values.

## Release gates

### Gate 0 — Reproducible engineering baseline
- Preserve `main`; work on a dedicated feature branch and review through pull requests.
- Establish repeatable dependency installation, type-checking, build, and automated test execution in CI.
- Record the source revision and the exact commands/results for every verification run.
- Do not label CI success as scientific validation.

### Gate 1 — Contracts and truthful claims
- Define input/output schemas, units, parameter ranges, failure modes, and provenance for each supported computation.
- Use one shared domain classifier; reject ambiguous or unsupported requests instead of silently selecting a domain.
- Distinguish `computed`, `estimated`, `illustrative`, and `unsupported` results in the API and UI.
- Remove claims that an algorithm ran unless that exact implementation actually ran.

### Gate 2 — Safety and state integrity
- Validate every API payload with explicit schemas and size/range limits.
- Add authentication/authorization appropriate to deployment; do not expose state mutation or telemetry ingestion as public unauthenticated operations.
- Apply least-privilege CORS/origin policy, security headers, request limits, and safe error handling.
- Make persistence atomic, schema-versioned, recoverable, and tested; exclude runtime/user histories from source control.
- Add API tests for invalid input, unauthorized access, oversized payloads, persistence failures, and concurrent updates.

### Gate 3 — Scientific kernel selection
Do not try to implement every scientific domain at once. Select one bounded, benchmarkable problem and implement it end to end.

For protein work, first decide which task is supported:
- sequence/structure validation and feature calculation;
- structure analysis from an explicit PDB/mmCIF input;
- a small, well-defined molecular-mechanics benchmark;
- or protein-structure prediction using an identified, versioned model/service.

These are different capabilities and must not be conflated. A genuine folding predictor is not achieved by relabeling a heuristic energy equation.

### Gate 4 — Independent scientific validation
For each kernel:
- cite authoritative method documentation and record model/force-field/data versions;
- test against published or independently generated reference cases;
- quantify error, numerical stability, sensitivity, convergence, and runtime;
- include negative, boundary, malformed-input, and regression cases;
- record tolerances and acceptance criteria before examining results;
- preserve machine-readable test outputs and provenance.

### Gate 5 — Release approval
A release is eligible for scientific review only when:
- software tests pass in a clean environment;
- security findings are resolved or explicitly risk-accepted;
- all supported outputs have traceable provenance;
- reference benchmarks meet predeclared acceptance thresholds;
- a reviewer can reproduce the reported results;
- limitations and intended use are documented.

"Approved engine" must name the approving body, scope, benchmark suite, and release revision. Until then, use "engineering-verified" or "scientifically benchmarked for [specific task]" only when the corresponding evidence exists.

## Execution order

1. Establish CI and dependency lockfile.
2. Add unit and API test harnesses; baseline existing behavior without blessing its scientific validity.
3. Correct domain dispatch and make unsupported/heuristic output status explicit.
4. Harden API routes and persistence.
5. Define the first protein task and scientific contract.
6. Implement that kernel and benchmark it independently.
7. Expand capabilities only after the previous gate passes.

## Non-negotiable rules

- Never fabricate test execution, benchmark results, citations, or approval.
- Never overwrite the baseline before a reviewed change is ready.
- Never use synthetic constants as if they were measured or simulation-derived results.
- Keep UI demonstrations separate from scientific evidence.
- Prefer small reviewable pull requests with a clear rollback path.


## Current branch progress (2026-10-22)

Implemented on `build/engine-validation-foundation`:
- CI type-check, regression-test, and production-build workflow.
- Explicit result-class/method provenance for new computed feature outputs; legacy formula outputs default to illustrative.
- API payload bounds and validation, production signed-session authentication, and a sign-in/sign-out flow.
- Primary-sequence feature kernel and coordinate-based PDB C-alpha geometry kernel, both exposed through the console/API.
- Shared domain classifier and regression tests for the new modules.

Latest verified revision at this checkpoint: `8ad597e4dd10528240fbd6788953eb53a439242e`. GitHub Actions passed type-checking, regression tests, and production build. The sequence suite includes a canonical 76-residue ubiquitin mass sanity case; the PDB suite currently uses synthetic coordinate fixtures. This is software CI evidence only.

Still open:
- Independent reference-data benchmarks for both new kernels.
- API integration tests including production auth, invalid payloads, and persistence failures.
- Rate limiting, reverse-proxy deployment review, and external security review.
- Historical cleanup review for the previously tracked runtime JSON.
- A genuine folding predictor / molecular mechanics path; no such capability is claimed by these kernels.
