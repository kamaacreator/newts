/**
 * Coordinate-based PDB structure descriptors.
 *
 * Parses C-alpha coordinates from the first model of a PDB text file and
 * calculates radius of gyration and nonlocal C-alpha contacts. This is
 * structure analysis only; it does not predict or repair a protein fold.
 */

export type ProteinStructureMetrics = {
  status: 'computed';
  method: 'pdb-ca-geometry-v1';
  atomSelection: 'ATOM CA, first model, alternate location blank/A';
  residueCount: number;
  chainCount: number;
  sequenceByChain: Record<string, string>;
  radiusOfGyrationAngstrom: number;
  nonlocalContactsAt8Angstrom: number;
  contactDefinition: string;
  limitations: string[];
};

import { parsePdbCaAtoms, THREE_TO_ONE } from './pdbParser.ts';

export function calculatePdbCaGeometry(pdbText: string): ProteinStructureMetrics {
  const points = parsePdbCaAtoms(pdbText);

  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const cz = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  const rgSquared = points.reduce((sum, p) => sum + (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2, 0) / points.length;

  const sequenceByChain: Record<string, string> = {};
  for (const point of points) {
    sequenceByChain[point.chain] = (sequenceByChain[point.chain] ?? '') + (THREE_TO_ONE[point.residueName] ?? 'X');
  }

  let contacts = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (a.chain === b.chain && Math.abs(a.chainOrder - b.chainOrder) <= 3) continue;
      const distanceSquared = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (distanceSquared < 64) contacts += 1;
    }
  }

  return {
    status: 'computed',
    method: 'pdb-ca-geometry-v1',
    atomSelection: 'ATOM CA, first model, alternate location blank/A',
    residueCount: points.length,
    chainCount: new Set(points.map((point) => point.chain)).size,
    sequenceByChain,
    radiusOfGyrationAngstrom: Number(Math.sqrt(rgSquared).toFixed(3)),
    nonlocalContactsAt8Angstrom: contacts,
    contactDefinition: 'Unique C-alpha pairs below 8.0 Å, excluding same-chain pairs separated by 3 or fewer C-alpha positions.',
    limitations: [
      'Geometry is computed from the supplied coordinates; the structure is not predicted or validated by this function.',
      'Only C-alpha atoms from the first PDB model are used; hydrogen atoms, side chains, ligands, and solvent are ignored.',
      'Non-standard residue names are represented as X in the derived sequence unless explicitly mapped.',
      'This is not an energy, stability, docking, dynamics, or folding calculation.',
    ],
  };
}
