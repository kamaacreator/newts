# Protein structural comparison: aligned C-alpha RMSD v1

## Supported task

Compare two supplied legacy PDB coordinate files by optimal rigid-body superposition and C-alpha root-mean-square deviation. This is structural comparison, not folding prediction.

API route: `POST /api/agent/protein/rmsd` with `mobilePdbText` and `referencePdbText`. The console exposes a two-file comparison control; select the mobile structure first and reference structure second.

## Method

- Parse C-alpha ATOM coordinates from the first model of each PDB.
- Match residues by exact chain ID, residue number, insertion code, and residue name.
- Center the matched coordinate sets.
- Solve the optimal rigid rotation using Horn's quaternion formulation of least-squares superposition.
- Compute RMSD after superposition and report matched/unmatched residue counts.

## Limitations and acceptance

- This implementation does not sequence-align residues, infer missing coordinates, or compare side chains.
- The result depends on the chosen atom selection and residue mapping. RMSD alone is not a complete structural-quality score.
- Synthetic tests verify translation/rotation invariance, sensitivity to coordinate perturbation, and explicit mismatch accounting.
- Before a scientifically benchmarked release, compare against an independent structural tool and a curated public reference structure, with the exact fixture provenance and tolerance recorded.
