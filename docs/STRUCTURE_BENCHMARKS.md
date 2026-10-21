# Public structural reference fixture: ubiquitin 1UBQ

## Provenance

- Structure identifier: **PDB 1UBQ**, human ubiquitin, chain A.
- Original archive source: [RCSB PDB download](https://files.rcsb.org/download/1UBQ.pdb).
- Vendored fixture path: `tests/fixtures/1ubq.pdb`.
- The vendored file is sourced from the public GitHub mirror [cytokineking/FreeBindCraft, example/ubiquitin_1ubq.pdb](https://github.com/cytokineking/FreeBindCraft/blob/c6f8994bf6deb455a5b8f449f36cd65915e6b307/example/ubiquitin_1ubq.pdb), which itself identifies the RCSB source in its header. It contains chain A ATOM records and omits waters and other HETATM records.

## What the benchmark asserts

- The parser returns 76 C-alpha residue coordinates for the canonical 76-residue ubiquitin chain.
- The first and last residue identities are MET and GLY.
- A copy transformed by a known proper rigid rotation and translation yields aligned C-alpha RMSD below 0.001 Å after PDB coordinate rounding.
- A residue identity mismatch at an otherwise identical residue key is excluded and counted as unmatched on both structures.

## Interpretation

This is a curated real-structure parser and rigid-body-invariance regression fixture. The rigidly transformed comparison has a mathematically expected RMSD of zero before coordinate serialization; the 0.001 Å tolerance allows for three-decimal PDB coordinate rounding. It is **not** an independent benchmark of biological prediction accuracy and does not establish that any folding predictor is accurate. A separate comparison against an independently implemented structural-alignment tool remains a release gate.
