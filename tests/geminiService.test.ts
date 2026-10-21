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
  assert.deepEqual(first, second);
  assert.ok(first.states.length > 0);
  assert.ok(first.deterministicCode?.includes('compute_folding_energy'));
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
    at25.states[0].metrics.find((metric) => metric.name === 'Gibbs Free Energy')?.value,
    at60.states[0].metrics.find((metric) => metric.name === 'Gibbs Free Energy')?.value,
  );
});

test('protein heuristic exposes threshold-selected rather than structure-derived RMSD', () => {
  const result = generateLocalDeterministicResolution('protein folding', {
    activeDomain: 'BIOLOGY',
    globalEnv: { temperature: 25, znConcentration: 1.0 },
  });
  const rmsd = result.states[0].metrics.find((metric) => metric.name === 'Backbone RMSD');

  // Documents the current threshold behavior; this is not scientific validation.
  assert.ok(rmsd);
  assert.equal(rmsd?.value, '0.08');
});
