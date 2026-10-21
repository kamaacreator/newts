import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAlignedCaRmsd } from '../services/proteinRmsd.ts';

type Point = { x: number; y: number; z: number; residue: string };

function atom(serial: number, point: Point, resSeq: number): string {
  return `ATOM  ${String(serial).padStart(5, ' ')} ${'CA'.padStart(4, ' ')} ${point.residue.padStart(3, ' ')} A${String(resSeq).padStart(4, ' ')}    ${point.x.toFixed(3).padStart(8, ' ')}${point.y.toFixed(3).padStart(8, ' ')}${point.z.toFixed(3).padStart(8, ' ')}  1.00 20.00           C`;
}

function pdb(points: Point[]): string {
  return points.map((point, i) => atom(i + 1, point, i + 1)).concat('END').join('\n');
}

const reference: Point[] = [
  { x: 0, y: 0, z: 0, residue: 'ALA' },
  { x: 1, y: 0, z: 0, residue: 'GLY' },
  { x: 0, y: 2, z: 0, residue: 'SER' },
  { x: 0, y: 0, z: 3, residue: 'THR' },
  { x: 1, y: 2, z: 3, residue: 'TYR' },
];

const rotatedTranslated = (points: Point[]): Point[] => points.map((p) => ({
  x: -p.y + 10,
  y: p.x - 5,
  z: p.z + 2,
  residue: p.residue,
}));

test('aligned C-alpha RMSD is near zero after rigid rotation and translation', () => {
  const result = calculateAlignedCaRmsd(pdb(rotatedTranslated(reference)), pdb(reference));
  assert.equal(result.status, 'computed');
  assert.equal(result.method, 'horn-quaternion-superposition-ca-rmsd-v1');
  assert.equal(result.matchedResidueCount, reference.length);
  assert.ok(result.alignedCaRmsdAngstrom < 0.001, `RMSD was ${result.alignedCaRmsdAngstrom} Å`);
});

test('aligned C-alpha RMSD detects a coordinate perturbation', () => {
  const perturbed = rotatedTranslated(reference).map((point, index) =>
    index === 4 ? { ...point, x: point.x + 1.0 } : point,
  );
  const result = calculateAlignedCaRmsd(pdb(perturbed), pdb(reference));
  assert.ok(result.alignedCaRmsdAngstrom > 0.1);
});

test('reports residue mapping exclusions explicitly', () => {
  const mobile = reference;
  const shortenedReference = reference.slice(0, 4);
  const result = calculateAlignedCaRmsd(pdb(mobile), pdb(shortenedReference));
  assert.equal(result.matchedResidueCount, 4);
  assert.equal(result.unmatchedMobileResidueCount, 1);
  assert.equal(result.unmatchedReferenceResidueCount, 0);
});

test('rejects structures with fewer than three matching C-alpha residues', () => {
  assert.throws(
    () => calculateAlignedCaRmsd(pdb(reference.slice(0, 2)), pdb(reference.slice(2, 4))),
    /At least three matching C-alpha residues/,
  );
});
