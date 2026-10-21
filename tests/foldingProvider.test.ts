import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FoldingProviderError,
  normalizeFoldingSequence,
  predictProteinStructure,
  type FoldingProviderConfig,
} from '../services/foldingProvider.ts';

const ubiquitinSequence = 'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG';
const ubiquitinPdb = readFileSync(new URL('./fixtures/1ubq.pdb', import.meta.url), 'utf8');
const config: FoldingProviderConfig = {
  endpoint: 'https://fold.example/predict',
  modelId: 'fixture-model-v1',
  providerName: 'test-provider',
  nodeEnv: 'test',
};

test('normalizes FASTA input and returns reproducible provider provenance', async () => {
  let sentBody = '';
  const fakeFetch: typeof fetch = async (_input, init) => {
    sentBody = String(init?.body ?? '');
    return new Response(ubiquitinPdb, { status: 200 });
  };

  const result = await predictProteinStructure(`>ubiquitin\n${ubiquitinSequence}`, config, fakeFetch);
  assert.equal(sentBody, ubiquitinSequence);
  assert.equal(result.sequenceLength, 76);
  assert.equal(result.caResidueCount, 76);
  assert.equal(result.provider, 'test-provider');
  assert.equal(result.modelId, 'fixture-model-v1');
  assert.equal(result.pdbSha256.length, 64);
  assert.equal(result.resultClass, 'computed');
});

test('fails closed when no folding provider is configured', async () => {
  let called = false;
  const fakeFetch: typeof fetch = async () => {
    called = true;
    return new Response(ubiquitinPdb, { status: 200 });
  };
  await assert.rejects(
    predictProteinStructure(ubiquitinSequence, {}, fakeFetch),
    (error: unknown) => error instanceof FoldingProviderError && error.code === 'UNAVAILABLE',
  );
  assert.equal(called, false);
});

test('rejects invalid or oversized sequences before making a network request', async () => {
  let called = false;
  const fakeFetch: typeof fetch = async () => {
    called = true;
    return new Response(ubiquitinPdb, { status: 200 });
  };
  assert.equal(normalizeFoldingSequence('>test\nACD EFG'), 'ACDEFG');
  await assert.rejects(
    predictProteinStructure('ACDX', config, fakeFetch),
    (error: unknown) => error instanceof FoldingProviderError && error.code === 'INVALID_INPUT',
  );
  await assert.rejects(
    predictProteinStructure('A'.repeat(769), config, fakeFetch),
    (error: unknown) => error instanceof FoldingProviderError && error.code === 'INVALID_INPUT',
  );
  assert.equal(called, false);
});

test('rejects a provider PDB whose sequence differs from the submitted sequence', async () => {
  const fakeFetch: typeof fetch = async () => new Response(ubiquitinPdb, { status: 200 });
  await assert.rejects(
    predictProteinStructure('ACDEFG', config, fakeFetch),
    (error: unknown) => error instanceof FoldingProviderError && error.code === 'INVALID_OUTPUT',
  );
});

test('maps upstream HTTP failures to an explicit provider error', async () => {
  const fakeFetch: typeof fetch = async () => new Response('provider unavailable', { status: 503 });
  await assert.rejects(
    predictProteinStructure(ubiquitinSequence, config, fakeFetch),
    (error: unknown) => error instanceof FoldingProviderError && error.code === 'UPSTREAM_FAILURE',
  );
});

test('requires HTTPS for configured production endpoints', async () => {
  const fakeFetch: typeof fetch = async () => new Response(ubiquitinPdb, { status: 200 });
  await assert.rejects(
    predictProteinStructure(ubiquitinSequence, { ...config, endpoint: 'http://fold.example/predict', nodeEnv: 'production' }, fakeFetch),
    (error: unknown) => error instanceof FoldingProviderError && error.code === 'UNAVAILABLE',
  );
});


test('rejects oversized streamed provider output before accepting the PDB', async () => {
  const fakeFetch: typeof fetch = async () => new Response('X'.repeat(2_000_001), { status: 200 });
  await assert.rejects(
    predictProteinStructure(ubiquitinSequence, config, fakeFetch),
    (error: unknown) => error instanceof FoldingProviderError && error.code === 'INVALID_OUTPUT',
  );
});
