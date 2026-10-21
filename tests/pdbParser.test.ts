import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePdbCaAtoms } from '../services/pdbParser.ts';

function atomLine(serial: number, residue: string, seq: string, x: string, y = '2.000', z = '3.000', altLoc = ' '): string {
  return `ATOM  ${String(serial).padStart(5, ' ')} ${'CA'.padStart(4, ' ')}${altLoc}${residue.padStart(3, ' ')} A${seq.padStart(4, ' ')}    ${x.padStart(8, ' ')}${y.padStart(8, ' ')}${z.padStart(8, ' ')}  1.00 20.00           C`;
}

test('rejects missing residue numbering and blank coordinates instead of coercing them to zero', () => {
  assert.throws(() => parsePdbCaAtoms(atomLine(1, 'ALA', '', '1.000')), /invalid or missing/);
  assert.throws(() => parsePdbCaAtoms(atomLine(1, 'ALA', '1', '')), /invalid or missing/);
});

test('rejects nonnumeric coordinates', () => {
  assert.throws(() => parsePdbCaAtoms(atomLine(1, 'ALA', '1', 'abc')), /invalid or missing/);
});

test('uses only the first explicit PDB model', () => {
  const pdb = [
    'MODEL        1',
    atomLine(1, 'ALA', '1', '1.000'),
    atomLine(2, 'GLY', '2', '2.000'),
    'ENDMDL',
    'MODEL        2',
    atomLine(3, 'VAL', '1', '9.000'),
    'ENDMDL',
  ].join('\\n');
  const atoms = parsePdbCaAtoms(pdb);
  assert.equal(atoms.length, 2);
  assert.equal(atoms[0].residueName, 'ALA');
  assert.equal(atoms[1].residueName, 'GLY');
});

test('prefers blank alternate location and ignores B-only alternate locations', () => {
  const pdb = [
    atomLine(1, 'ALA', '1', '1.000', '2.000', '3.000', 'A'),
    atomLine(2, 'ALA', '1', '4.000', '5.000', '6.000', ' '),
    atomLine(3, 'GLY', '2', '7.000', '8.000', '9.000', 'B'),
  ].join('\\n');
  const atoms = parsePdbCaAtoms(pdb);
  assert.equal(atoms.length, 1);
  assert.equal(atoms[0].residueName, 'ALA');
  assert.equal(atoms[0].x, 4);
});
