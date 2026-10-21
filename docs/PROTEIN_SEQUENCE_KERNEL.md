# Protein primary-sequence feature kernel v1

## Supported task

Given a plain amino-acid sequence or FASTA text, calculate primary-sequence descriptors only. Invoke from the command console using:

```text
SEQUENCE: ACDEFGHIK
```

FASTA headers and line breaks are accepted. Spaces and digits are ignored. The kernel accepts the 20 standard amino-acid symbols and rejects ambiguous/non-standard symbols, empty input, and sequences longer than 10,000 residues.

## Outputs and definitions

| Output | Unit | Definition |
|---|---|---|
| Sequence length | residues | Count of validated standard amino-acid symbols |
| Average molecular mass | Da | Sum of average residue masses plus one H2O for a linear, unmodified polypeptide |
| GRAVY | dimensionless | Arithmetic mean of Kyte–Doolittle residue hydropathy values |
| Theoretical pI | pH estimate | Bisection solution for zero net charge using the fixed pKa values documented in source |
| Composition | residues per amino acid | Integer count for each of the 20 standard residues |

Method identifier: `primary-sequence-features-v1`.

## Validation status

- Software regression tests cover a single-residue mass calculation, FASTA normalization, composition invariants, unsupported symbols, empty input, length limit, and disclosure of limitations.
- These tests validate implementation behavior, not experimental accuracy of predicted pI or any biological outcome.
- Theoretical pI is sensitive to the selected pKa model. The result is an estimate and must not be presented as measured pI.
- Mass assumes a linear unmodified chain; modifications, ligands, and other chemistry are outside scope.
- GRAVY is a sequence descriptor, not a solubility, aggregation, stability, or folding predictor.

## Explicitly out of scope

This kernel does not calculate a three-dimensional structure, folding free energy, RMSD, folding kinetics, mutation effects, molecular dynamics, electrostatics, or a protein's biological function. Those claims require separate implementations and independent benchmark suites.


## Reference sanity case

The regression suite includes canonical 76-residue ubiquitin (sequence beginning `MQIFVKTL...`) with expected average mass approximately 8,564–8,565 Da and the GRAVY value calculated from the documented Kyte–Doolittle scale. A public reference lists ubiquitin at 8,564 Da average mass: [MRC Protein Phosphorylation and Ubiquitylation Unit](https://mrcppureagents.dundee.ac.uk/product/62290). This is a sanity check for a sequence descriptor, not validation of pI estimates or protein folding.
