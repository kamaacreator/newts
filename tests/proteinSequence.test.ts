import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProteinSequenceFeatures } from '../services/proteinSequence.ts';

test('calculates length, composition, mass, and GRAVY for a single alanine', () => {
  const result = calculateProteinSequenceFeatures('A');
  assert.equal(result.status, 'computed');
  assert.equal(result.sequenceLength, 1);
  assert.equal(result.composition.A, 1);
  assert.equal(result.composition.C, 0);
  assert.ok(Math.abs(result.molecularMassDa - 89.09408) < 0.002);
  assert.equal(result.gravy, 1.8);
  assert.ok(result.theoreticalPi > 0 && result.theoreticalPi < 14);
});

test('accepts FASTA headers and line wrapping without changing sequence features', () => {
  const plain = calculateProteinSequenceFeatures('ACDEFG');
  const fasta = calculateProteinSequenceFeatures('>test protein\nACD\nEFG\n');
  assert.deepEqual(fasta, plain);
});

test('calculates composition counts that sum to sequence length', () => {
  const sequence = 'MKWVTFISLL';
  const result = calculateProteinSequenceFeatures(sequence);
  assert.equal(Object.values(result.composition).reduce((sum, count) => sum + count, 0), sequence.length);
  assert.equal(result.composition.M, 1);
  assert.equal(result.composition.L, 2);
  assert.equal(result.sequenceLength, sequence.length);
});

test('rejects empty sequences and unsupported residue symbols', () => {
  assert.throws(() => calculateProteinSequenceFeatures('  \n '), /empty/i);
  assert.throws(() => calculateProteinSequenceFeatures('ACDX'), /Unsupported amino-acid symbol/);
});

test('rejects sequences above the configured length limit', () => {
  assert.throws(() => calculateProteinSequenceFeatures('A'.repeat(10001)), /10,000-residue limit/);
});

test('reports scientific limitations and identifies the method version', () => {
  const result = calculateProteinSequenceFeatures('ACDE');
  assert.equal(result.method, 'primary-sequence-features-v1');
  assert.ok(result.limitations.some((item) => item.includes('folding pathway is computed')));
  assert.ok(result.limitations.some((item) => item.includes('pKa')));
});

test('matches the known size and approximate mass of canonical ubiquitin', () => {
  // Canonical 76-residue ubiquitin; external reference lists a mass of about 8,564–8,565 Da.
  const ubiquitin = 'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG';
  const result = calculateProteinSequenceFeatures(ubiquitin);
  assert.equal(result.sequenceLength, 76);
  assert.ok(Math.abs(result.molecularMassDa - 8565) < 1.0);
  assert.ok(Math.abs(result.gravy - (-0.4895)) < 0.001);
});
