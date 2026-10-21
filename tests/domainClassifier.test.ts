import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyScientificDomain } from '../services/domainClassifier.ts';

test('routes explicit protein sequence analysis to biology', () => {
  assert.equal(classifyScientificDomain('SEQUENCE: ACDEFG', 'AI'), 'BIOLOGY');
});

test('classifies tokamak plasma as physics rather than AI', () => {
  assert.equal(classifyScientificDomain('Explain tokamak plasma stability', 'AI'), 'PHYSICS');
});

test('classifies structural FEA and machine learning consistently', () => {
  assert.equal(classifyScientificDomain('FEA cantilever beam stress', 'BIOLOGY'), 'ENGINEERING');
  assert.equal(classifyScientificDomain('train a neural network model', 'BIOLOGY'), 'AI');
});

test('uses explicit fallback only when no known domain terms are present', () => {
  assert.equal(classifyScientificDomain('show status', 'PHYSICS'), 'PHYSICS');
});
