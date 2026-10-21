import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePdbCaAtoms } from '../services/pdbParser.ts';
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


const ubiquitinPdb = readFileSync(new URL('./fixtures/1ubq.pdb', import.meta.url), 'utf8');

function transformPdbRigidly(pdbText: string): string {
  return pdbText.split(/\\r?\\n/).map((line) => {
    if (line.slice(0, 6).trim() !== 'ATOM' || line.slice(12, 16).trim() !== 'CA' || line.length < 54) return line;
    const x = Number(line.slice(30, 38));
    const y = Number(line.slice(38, 46));
    const z = Number(line.slice(46, 54));
    const fmt = (value: number) => value.toFixed(3).padStart(8, ' ');
    return line.slice(0, 30) + fmt(-y + 10) + fmt(x - 5) + fmt(z + 2) + line.slice(54);
  }).join('\\n');
}

test('public 1UBQ ubiquitin fixture parses 76 C-alpha residues', () => {
  const atoms = parsePdbCaAtoms(ubiquitinPdb);
  assert.equal(atoms.length, 76);
  assert.equal(atoms[0].residueName, 'MET');
  assert.equal(atoms[75].residueName, 'GLY');
});

test('1UBQ structure has near-zero aligned RMSD against a rigidly transformed copy', () => {
  const result = calculateAlignedCaRmsd(transformPdbRigidly(ubiquitinPdb), ubiquitinPdb);
  assert.equal(result.matchedResidueCount, 76);
  assert.equal(result.unmatchedMobileResidueCount, 0);
  assert.equal(result.unmatchedReferenceResidueCount, 0);
  assert.ok(result.alignedCaRmsdAngstrom < 0.001, `1UBQ transformed RMSD was ${result.alignedCaRmsdAngstrom} Å`);
});

test('same residue key with a mismatched identity is counted unmatched on both sides', () => {
  const mobile = reference.map((point, index) => index === 0 ? { ...point, residue: 'VAL' } : point);
  const result = calculateAlignedCaRmsd(pdb(mobile), pdb(reference));
  assert.equal(result.matchedResidueCount, 4);
  assert.equal(result.unmatchedMobileResidueCount, 1);
  assert.equal(result.unmatchedReferenceResidueCount, 1);
});
