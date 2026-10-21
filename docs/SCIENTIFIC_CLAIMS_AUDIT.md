# Scientific Claim-to-Code Audit

This document records the initial source review of `main` at `6393f7116328be10e8a2afff16ef6b467d59ee93`. It is a source review, not an execution report. No build, test suite, or scientific benchmark is claimed to have passed.

| Displayed or implied capability | Source behavior observed | Current classification | Evidence required before stronger claim |
|---|---|---|---|
| Protein folding / p53 stability | Fixed residue count (393); simple hand-coded energy-like terms; threshold-based RMSD; no coordinate input in this branch | Heuristic estimate / illustrative | Defined input structure or sequence contract; implemented algorithm; structure-based metrics where claimed; independent reference benchmark |
| Poisson–Boltzmann electrostatics / SASA | These methods are named in summary text, but the inspected branch contains no corresponding solver or surface-area computation | Claim unsupported by inspected implementation | Actual solver/dependency, configuration, numerical tests, reference cases |
| Conformational ensemble / kinetic trapping | Output states and transition probabilities are synthesized from formula values | Illustrative state narrative | Explicit state representation, defined transition model, sampling or solver, calibrated/validated probabilities |
| CRISPR kinetics | Formula-based estimates from parsed guide length, PAM presence, chromatin density, and temperature | Simplified heuristic | Biological parameter provenance, unit-consistent model, calibrated comparisons to experimental data |
| Structural FEA / SIMP optimization | Output values use closed-form expressions and fixed constants; inspected code does not assemble a stiffness matrix or iterate an optimizer | Illustrative estimate | Implemented FE assembly/solver and optimization loop; mesh/convergence and benchmark tests |
| Machine-learning training | Loss and accuracy are calculated from a preset exponential expression | Synthetic illustration | Actual model/data/training pipeline and independently measured held-out evaluation |
| Plasma equilibrium | Selected metrics are estimated with algebraic expressions; no Grad–Shafranov solver is present in the inspected code | Simplified estimate | Implemented equilibrium solver, boundary conditions, solver diagnostics, benchmark cases |
| Execution lifecycle modes | `runStep()` advances enum states and writes logs | UI/control-state simulation | Concrete work units executed in each phase and observable success/failure conditions |
| “Deterministic” result | Repeated local arithmetic can be deterministic, but determinism does not establish scientific validity | Narrowly deterministic computation | Reproducibility tests plus independent scientific validation |

## Initial implementation inconsistencies

1. The initial p53 entity is seeded with Gibbs free energy `-7.5` and stability `0.9999999`. Under the protein service formula at 25 °C and zinc concentration 1.0, the energy-like result is approximately `-6.551` and the formula's stability index is approximately `0.886`. Initialization and computation are inconsistent.
2. Domain dispatch is duplicated in `server.ts` and `services/geminiService.ts`; the ordering differs, allowing a command to be assigned different domains at different layers.
3. The package scripts expose `build` and `lint`, but no dedicated test script was present in the inspected `package.json`.
4. The server accepts broad request-body merges in `POST /api/agent/state` and includes state-changing routes without visible authentication/authorization in the inspected source. Deployment exposure and threat model still need verification.

## Audit vocabulary

- **Implemented:** the described algorithm exists in source and is called for this result.
- **Executed:** the algorithm was run; the exact command, environment, revision, and output are recorded.
- **Verified:** defined tests passed against stated expectations.
- **Scientifically validated:** independent reference evidence meets predeclared tolerances for a specific task and operating range.
- **Approved:** an identified reviewer or governing body accepted a named scope and revision.

These terms are not interchangeable.
