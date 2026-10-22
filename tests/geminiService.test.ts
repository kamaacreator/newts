import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLocalDeterministicResolution } from '../services/geminiService.ts';

// These are software regression tests for the current heuristic prototype.
// They do not validate the scientific model.

test('protein heuristic returns a deterministic structured result', () => {
  const context = {
    activeDomain: 'BIOLOGY' as const,
    globalEnv: { temperature: 25, znConcentration: 1.0 },
  };
  const first = generateLocalDeterministicResolution('protein folding', context);
  const second = generateLocalDeterministicResolution('protein folding', context);

  assert.equal(first.status, 'RESOLVED');
  assert.equal(first.resultClass, 'illustrative');
  assert.equal(first.method, 'legacy-formula-illustration-v0');
  assert.match(first.summary, /ILLUSTRATIVE protein heuristic/i);
  assert.match(first.summary, /no sequence-specific structure/i);
  assert.match(first.summary, /no coordinate-derived RMSD/i);
  assert.ok(first.deterministicCode?.includes('ILLUSTRATIVE EXAMPLE ONLY — NOT EXECUTED BY AETHERIS'));
  assert.deepEqual(first, second);
  assert.ok(first.states.length > 0);
  assert.ok(first.deterministicCode?.includes('illustrative_folding_formula'));
});

test('protein heuristic output responds to temperature input', () => {
  const at25 = generateLocalDeterministicResolution('protein folding', {
    activeDomain: 'BIOLOGY',
    globalEnv: { temperature: 25, znConcentration: 1.0 },
  });
  const at60 = generateLocalDeterministicResolution('protein folding', {
    activeDomain: 'BIOLOGY',
    globalEnv: { temperature: 60, znConcentration: 1.0 },
  });

  assert.notEqual(
    at25.states[0].metrics.find((metric) => metric.name === 'Illustrative energy-like score')?.value,
    at60.states[0].metrics.find((metric) => metric.name === 'Illustrative energy-like score')?.value,
  );
});

test('protein heuristic never fabricates a coordinate-derived RMSD', () => {
  const result = generateLocalDeterministicResolution('protein folding', {
    activeDomain: 'BIOLOGY',
    globalEnv: { temperature: 25, znConcentration: 1.0 },
  });
  const rmsd = result.states[0].metrics.find((metric) => metric.name === 'Coordinate-derived RMSD');

  assert.ok(rmsd);
  assert.equal(rmsd?.value, 'Not calculated');
  assert.equal(rmsd?.unit, 'not available');
});


test('all legacy domain branches identify themselves as illustrative', () => {
  const cases = [
    ['CRISPR Cas9 cleavage', 'BIOLOGY'],
    ['FEA cantilever beam stress', 'ENGINEERING'],
    ['train a neural network model', 'AI'],
    ['tokamak plasma equilibrium', 'PHYSICS'],
  ] as const;

  for (const [command, expectedDomain] of cases) {
    const result = generateLocalDeterministicResolution(command, { activeDomain: expectedDomain });
    assert.equal(result.resultClass, 'illustrative', command);
    assert.equal(result.method, 'legacy-formula-illustration-v0', command);
    assert.match(result.summary, /ILLUSTRATIVE/i, command);
    assert.doesNotMatch(result.summary, /MECHANISTIC|Grad.?Shafranov solution|finite-element equilibrium computed/i, command);
  }
});
