import { createHash } from 'node:crypto';
import { parsePdbCaAtoms, THREE_TO_ONE } from './pdbParser.ts';

const MAX_SEQUENCE_LENGTH = 768;
const MAX_PDB_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 180_000;
const STANDARD_AMINO_ACIDS = /^[ACDEFGHIKLMNPQRSTVWY]+$/;

export type FoldingProviderConfig = {
  endpoint?: string;
  apiKey?: string;
  modelId?: string;
  providerName?: string;
  nodeEnv?: string;
};

export type FoldingPrediction = {
  status: 'computed';
  resultClass: 'computed';
  method: 'configured-folding-provider-v1';
  provider: string;
  modelId: string;
  sequenceLength: number;
  caResidueCount: number;
  pdbSha256: string;
  pdbText: string;
  limitations: string[];
};

export class FoldingProviderError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNAVAILABLE' | 'INVALID_INPUT' | 'UPSTREAM_FAILURE' | 'TIMEOUT' | 'INVALID_OUTPUT',
  ) {
    super(message);
    this.name = 'FoldingProviderError';
  }
}

export function normalizeFoldingSequence(input: unknown): string {
  if (typeof input !== 'string') {
    throw new FoldingProviderError('Sequence must be a string.', 'INVALID_INPUT');
  }
  const sequence = input
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('>'))
    .join('')
    .replace(/\s/g, '')
    .toUpperCase();

  if (sequence.length === 0) {
    throw new FoldingProviderError('Protein sequence is empty.', 'INVALID_INPUT');
  }
  if (sequence.length > MAX_SEQUENCE_LENGTH) {
    throw new FoldingProviderError(`Sequence exceeds the configured ${MAX_SEQUENCE_LENGTH}-residue provider limit.`, 'INVALID_INPUT');
  }
  if (!STANDARD_AMINO_ACIDS.test(sequence)) {
    throw new FoldingProviderError('Sequence contains unsupported symbols; use the 20 standard amino acids only.', 'INVALID_INPUT');
  }
  return sequence;
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new FoldingProviderError('Folding provider returned an oversized structure.', 'INVALID_OUTPUT');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(combined);
}

function resolveEndpoint(config: FoldingProviderConfig): URL {
  if (!config.endpoint || !config.modelId?.trim()) {
    throw new FoldingProviderError(
      'No folding predictor is configured. Set AETHERIS_FOLDING_ENDPOINT and AETHERIS_FOLDING_MODEL_ID; no heuristic fallback is used.',
      'UNAVAILABLE',
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(config.endpoint);
  } catch {
    throw new FoldingProviderError('AETHERIS_FOLDING_ENDPOINT must be a valid URL.', 'UNAVAILABLE');
  }

  const isLoopback = endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1' || endpoint.hostname === '::1';
  if (endpoint.protocol !== 'https:' && !(config.nodeEnv !== 'production' && isLoopback && endpoint.protocol === 'http:')) {
    throw new FoldingProviderError('The folding provider endpoint must use HTTPS in production.', 'UNAVAILABLE');
  }
  if (endpoint.username || endpoint.password) {
    throw new FoldingProviderError('Do not embed credentials in the folding provider URL; use AETHERIS_FOLDING_API_KEY.', 'UNAVAILABLE');
  }
  return endpoint;
}

/**
 * Calls a configured ESMFold-compatible service. Contract: POST the amino-acid
 * sequence as text/plain; receive a PDB text body. No public endpoint is selected
 * by default and no synthetic or heuristic structure is ever returned.
 */
export async function predictProteinStructure(
  input: unknown,
  config: FoldingProviderConfig = {
    endpoint: process.env.AETHERIS_FOLDING_ENDPOINT,
    apiKey: process.env.AETHERIS_FOLDING_API_KEY,
    modelId: process.env.AETHERIS_FOLDING_MODEL_ID,
    providerName: process.env.AETHERIS_FOLDING_PROVIDER || 'configured-folding-provider',
    nodeEnv: process.env.NODE_ENV,
  },
  fetchImpl: typeof fetch = fetch,
): Promise<FoldingPrediction> {
  const sequence = normalizeFoldingSequence(input);
  const endpoint = resolveEndpoint(config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      Accept: 'text/plain',
      'Content-Type': 'text/plain; charset=utf-8',
    };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: sequence,
        signal: controller.signal,
        redirect: 'error',
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new FoldingProviderError('Folding provider request timed out after 180 seconds.', 'TIMEOUT');
      }
      throw new FoldingProviderError(
        `Folding provider request failed: ${error instanceof Error ? error.message : 'network error'}`,
        'UPSTREAM_FAILURE',
      );
    }

    if (!response.ok) {
      throw new FoldingProviderError(`Folding provider returned HTTP ${response.status}.`, 'UPSTREAM_FAILURE');
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PDB_BYTES) {
      throw new FoldingProviderError('Folding provider returned an oversized structure.', 'INVALID_OUTPUT');
    }

    let pdbText: string;
    try {
      pdbText = await readLimitedText(response, MAX_PDB_BYTES);
    } catch (error) {
      if (error instanceof FoldingProviderError) throw error;
      if (controller.signal.aborted) {
        throw new FoldingProviderError('Folding provider request timed out after 180 seconds.', 'TIMEOUT');
      }
      throw new FoldingProviderError('Could not read a valid PDB response from the folding provider.', 'INVALID_OUTPUT');
    }
    if (!pdbText.trim()) {
      throw new FoldingProviderError('Folding provider returned an empty structure.', 'INVALID_OUTPUT');
    }

    let caResidueCount: number;
    try {
      const atoms = parsePdbCaAtoms(pdbText);
      caResidueCount = atoms.length;
      if (new Set(atoms.map((atom) => atom.chain)).size !== 1) {
        throw new Error('Multiple chains are not supported by the single-sequence endpoint');
      }
      const predictedSequence = atoms.map((atom) => THREE_TO_ONE[atom.residueName]).join('');
      if (!predictedSequence || predictedSequence !== sequence) {
        throw new Error('Predicted structure sequence does not match the submitted sequence');
      }
    } catch {
      throw new FoldingProviderError(
        'Folding provider response failed PDB validation or did not match the submitted sequence exactly.',
        'INVALID_OUTPUT',
      );
    }

    return {
      status: 'computed',
      resultClass: 'computed',
      method: 'configured-folding-provider-v1',
      provider: config.providerName?.trim() || endpoint.hostname,
      modelId: config.modelId!.trim(),
      sequenceLength: sequence.length,
      caResidueCount,
      pdbSha256: createHash('sha256').update(pdbText).digest('hex'),
      pdbText,
      limitations: [
        'Coordinates are model predictions, not experimentally determined structures.',
        'Prediction quality depends on the configured model, its version, and its supported sequence distribution.',
        'No confidence metric is reported unless a provider-specific adapter explicitly extracts and validates one.',
        'The configured provider receives the submitted sequence; do not send sensitive or restricted sequences without authorization.',
      ],
    };
  } finally {
    clearTimeout(timeout);
  }
}
