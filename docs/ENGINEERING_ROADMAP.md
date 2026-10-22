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

### Completed software scope on the feature branch

- Sequence features and PDB C-alpha geometry are separate, explicitly named computations; they do not claim to perform folding.
- Horn quaternion aligned C-alpha RMSD has parser regression tests, a public 1UBQ fixture, rigid-transform invariance, perturbation sensitivity, and explicit residue mismatch accounting.
- Independent numerical verification is being added: compare the TypeScript RMSD against Biopython's independent Kabsch superposition on the same rigidly transformed and perturbed 1UBQ coordinates.
- Authentication hardening is integrated into the current quality-gates branch: unique revocable sessions, login throttling, no-store auth responses, malformed-cookie handling, and explicit reverse-proxy trust configuration.
- The folding API uses a configured provider/model, validates sequence/PDB correspondence, records provenance, bounds response size and timeout, and fails closed if no provider is configured.
- A self-hosted ESMFold v1 service is included with bearer-token auth, bounded request size, output validation, readiness/liveness, and a cap of two in-flight requests.
- CI now requires lockfile-exact npm installation, dependency audit, type checking, all Node tests, the independent RMSD cross-check, production build, Python contract tests, and a container build/import smoke test.

### Current verification status

The prior provider/service implementation passed its software CI on `2a6ee449ef2e16b30478ea8cb9f1cfd29d161804`. The expanded gold-standard branch has additional tests and a Docker build gate; do not call the new branch green until its latest workflow completes successfully. A Docker image build and package-import smoke test do not constitute live model inference.

### Release blockers

- Run real ESMFold inference on a supported GPU host with the pinned container and weights.
- Verify output provenance, sequence correspondence, coordinates, runtime, VRAM and failure behavior end-to-end.
- Compare predictions against a curated experimental structure set using predeclared metrics and leakage-aware evaluation; obtain independent scientific review.
- Add end-to-end API tests for production authentication, persistence failures, and concurrent updates.
- Replace process-local login/session state with a shared store before horizontal scaling.
- Inspect Git history for private content in previously tracked runtime JSON; removal from the current tree does not erase prior blobs.
- Implement and independently validate the actual numerical solvers for other domains before advertising them as scientific engines.

Software CI, live operational verification, scientific benchmarking, and formal approval remain distinct gates.
