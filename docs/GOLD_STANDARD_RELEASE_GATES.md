# Gold-standard release gates

This file is the acceptance contract for release candidates. It is intentionally stricter than a successful frontend build.

## Result vocabulary

- **PASS** — command or test executed against the candidate commit, exit status and output inspected, and every assertion passed.
- **FAIL** — executed test or gate did not meet its declared acceptance criteria.
- **BLOCKED** — required test could not be run because of missing infrastructure, credentials, compatible hardware, data, or reviewer access.
- **NOT APPLICABLE** — documented reason shows that a gate is outside the release's declared scope.

A blocked or not-applicable gate is never silently converted into a pass. The release report must include the commit SHA, command/workflow URL, environment, result, and any exclusions.

## Gate A — Reproducible software

- [ ] Install JavaScript dependencies from the lockfile using `npm ci`.
- [ ] NPM dependency audit has no unaccepted high/critical findings.
- [ ] TypeScript type check passes.
- [ ] Every Node regression test passes.
- [ ] Production build passes.
- [ ] Python folding-service contract tests pass.
- [ ] Docker image builds from a clean context.
- [ ] Container smoke test imports the exact PyTorch, ESM and OpenFold packages.
- [ ] Independent RMSD cross-check agrees with Biopython's Kabsch superposition within 0.01 Å for both rigid-body and perturbed reference cases.
- [ ] Test artifacts and outputs are retained or linked from the release report.

## Gate B — API and data integrity

- [ ] Valid, malformed, empty, oversized, and unsupported inputs have explicit tests.
- [ ] Authentication, login throttling, session expiry, session revocation, and missing configuration have explicit tests.
- [ ] Provider timeout, upstream error, invalid PDB, sequence mismatch, and oversized response have explicit tests.
- [ ] No fallback can turn provider failure into a fabricated prediction.
- [ ] Prediction output has provider/model/method provenance and a content hash.
- [ ] Runtime data writes are atomic and recoverable; no private runtime history is tracked in the source tree.
- [ ] API errors do not disclose secrets, local paths, stack traces, or upstream credentials.
- [ ] Shared rate limiting/session storage and trusted-proxy settings are reviewed before horizontal scaling.

## Gate C — Live model execution

- [ ] Build the exact Docker image on a supported target host.
- [ ] Record GPU model, VRAM, driver, CUDA runtime, Python, PyTorch, ESM and OpenFold versions.
- [ ] Load the real model weights; readiness remains false until loading succeeds.
- [ ] Run a known public reference sequence end-to-end through the service and application API.
- [ ] Verify the returned PDB parses, contains the expected residue identities, and has finite coordinates.
- [ ] Record latency, peak GPU memory, CPU/RAM use, logs, output hash, and failure/retry behavior.
- [ ] Exercise maximum supported sequence length and low-memory/error conditions.
- [ ] Confirm no sequence or structure is persisted or sent to unapproved services.

A CI container build does not satisfy live model execution. Mocked model tests do not satisfy this gate.

## Gate D — Scientific validation

- [ ] Define intended use and unsupported cases before evaluating outputs.
- [ ] Use a curated set of experimentally determined structures with provenance and licensing recorded.
- [ ] Prevent training/evaluation leakage to the extent model/data provenance permits; explicitly document unavoidable overlap for pretrained models.
- [ ] Predeclare metrics, atom selection, residue mapping, missing-residue treatment, acceptance thresholds, and evaluation exclusions.
- [ ] Compare against at least one independent reference implementation.
- [ ] Report per-target results and aggregate distributions, not only a best example or mean.
- [ ] Evaluate confidence calibration separately from coordinate accuracy.
- [ ] Document failure cases, sequence-length limits, disordered regions, multimer/ligand limitations, and model license/intended use.
- [ ] Obtain independent scientific review before using terms such as “validated” or “approved.”

## Gate E — Release decision

A release is **engineering-verified** only if Gates A and B pass. It is **live-model operationally verified** only if Gate C passes. It is **scientifically benchmarked** only if Gate D passes for the explicitly named task and operating range.

Do not claim “gold standard”, clinical readiness, experimental accuracy, or general protein-folding approval based on CI alone. Approval must name the reviewer/body, scope, evidence, and exact commit SHA.

## Current known exclusions

- GitHub CI has no GPU runner, so it cannot by itself prove real ESMFold inference.
- A public structure fixture and a rigid-transform invariant test are regression tests, not a biological prediction benchmark.
- The self-hosted model dependency stack is legacy and CUDA-toolchain sensitive; the actual container build is now a required CI gate.
- Session and login throttling state are process-local and unsuitable for multiple application instances without a shared store.
