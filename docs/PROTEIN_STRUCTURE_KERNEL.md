# Protein structure geometry kernel v1

## Supported task

Calculate simple geometric descriptors from an existing PDB coordinate file. This is structure analysis, not structure prediction or folding.

Production API route: `POST /api/agent/protein/structure`

Request body:

```json
{
  "pdbText": "ATOM records from a PDB file..."
}
```

In production this route requires the authenticated session described in `DEPLOYMENT_SECURITY.md`.

## Computation

- Select `ATOM` records for C-alpha (`CA`) atoms in the first PDB model.
- Accept alternate location blank or A; preserve one coordinate per chain/residue/insertion-code key.
- Derive a one-letter sequence per chain from recognized three-letter residue names.
- Compute C-alpha radius of gyration from the centroid of selected coordinates.
- Count unique C-alpha pairs with distance strictly below 8.0 Å, excluding same-chain pairs separated by three or fewer C-alpha positions.

## Limits and interpretation

- PDB text is limited to 2 MB; structures are limited to 5,000 selected residues.
- Radius of gyration is in Å. Contact count is a geometry descriptor dependent on the supplied coordinate model and chosen cutoff.
- This function does not validate the PDB against a database, repair missing atoms, infer missing residues, assess stereochemistry, calculate energy, or predict a fold.
- The parser handles legacy fixed-column PDB ATOM records, not mmCIF.
- Synthetic unit tests validate geometry and parser behavior; independent benchmark comparison against curated reference structures remains a release gate.
