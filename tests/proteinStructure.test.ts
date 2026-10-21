import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePdbCaGeometry } from '../services/proteinStructure.ts';

function atom(serial: number, residue: string, chain: string, resSeq: number, x: number, y: number, z: number): string {
  return `ATOM  ${String(serial).padStart(5, ' ')} ${'CA'.padStart(4, ' ')} ${residue.padStart(3, ' ')} ${chain}${String(resSeq).padStart(4, ' ')}    ${x.toFixed(3).padStart(8, ' ')}${y.toFixed(3).padStart(8, ' ')}${z.toFixed(3).padStart(8, ' ')}  1.00 20.00           C`;
}

test('calculates C-alpha radius of gyration and nonlocal contacts from coordinates', () => {
  const pdb = [
    atom(1, 'ALA', 'A', 1, 0, 0, 0),
    atom(2, 'GLY', 'A', 2, 3, 0, 0),
    atom(3, 'SER', 'A', 3, 6, 0, 0),
    atom(4, 'THR', 'A', 4, 9, 0, 0),
    atom(5, 'TYR', 'A', 5, 0, 4, 0),
    'END',
  ].join('\n');
  const result = calculatePdbCaGeometry(pdb);
  assert.equal(result.status, 'computed');
  assert.equal(result.method, 'pdb-ca-geometry-v1');
  assert.equal(result.residueCount, 5);
  assert.equal(result.chainCount, 1);
  assert.equal(result.sequenceByChain.A, 'AGSTY');
  assert.equal(result.nonlocalContactsAt8Angstrom, 1);
  assert.ok(Math.abs(result.radiusOfGyrationAngstrom - 3.847) < 0.002);
});

test('uses only C-alpha ATOM records and the first model', () => {
  const pdb = [
    'MODEL        1',
    atom(1, 'ALA', 'A', 1, 0, 0, 0),
    atom(2, 'GLY', 'A', 2, 3, 0, 0),
    'ENDMDL',
    'MODEL        2',
    atom(3, 'VAL', 'A', 1, 100, 0, 0),
    'ENDMDL',
  ].join('\n');
  const result = calculatePdbCaGeometry(pdb);
  assert.equal(result.residueCount, 2);
  assert.equal(result.sequenceByChain.A, 'AG');
});

test('rejects empty, missing-coordinate, and oversized structures', () => {
  assert.throws(() => calculatePdbCaGeometry('  '), /empty/i);
  assert.throws(() => calculatePdbCaGeometry('HEADER no atoms'), /No C-alpha ATOM records/);
  assert.throws(() => calculatePdbCaGeometry('x'.repeat(2_000_001)), /2 MB limit/);
});

test('includes the structure-analysis limitations in the result', () => {
  const result = calculatePdbCaGeometry(atom(1, 'ALA', 'A', 1, 0, 0, 0));
  assert.ok(result.limitations.some((item) => item.includes('not predicted')));
  assert.ok(result.limitations.some((item) => item.includes('not an energy')));
});
