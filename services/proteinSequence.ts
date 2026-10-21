/**
 * Protein primary-sequence feature kernel.
 *
 * Computes composition, average molecular mass, Kyte–Doolittle GRAVY, and an
 * approximate theoretical isoelectric point from a supplied amino-acid sequence.
 * This is NOT a structure predictor, folding simulator, or stability predictor.
 *
 * Method notes:
 * - Hydropathy scale: Kyte & Doolittle, J. Mol. Biol. 157 (1982), 105–132.
 * - Molecular mass uses average residue masses (condensation residue masses) plus
 *   one water molecule for the peptide termini.
 * - pI is a model estimate from Henderson–Hasselbalch charge balance with fixed
 *   approximate pKa values; it is not an experimentally measured value.
 */

export type ProteinSequenceFeatures = {
  status: 'computed';
  method: 'primary-sequence-features-v1';
  sequenceLength: number;
  molecularMassDa: number;
  gravy: number;
  theoreticalPi: number;
  composition: Record<string, number>;
  limitations: string[];
};

const AMINO_ACIDS = 'ACDEFGHIKLMNPQRSTVWY';

const RESIDUE_MASS_DA: Record<string, number> = {
  A: 71.0788, C: 103.1388, D: 115.0886, E: 129.1155, F: 147.1766,
  G: 57.0519, H: 137.1411, I: 113.1594, K: 128.1741, L: 113.1594,
  M: 131.1926, N: 114.1038, P: 97.1167, Q: 128.1307, R: 156.1875,
  S: 87.0782, T: 101.1051, V: 99.1326, W: 186.2132, Y: 163.1760,
};

const KYTE_DOOLITTLE: Record<string, number> = {
  I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8, G: -0.4,
  T: -0.7, S: -0.8, W: -0.9, Y: -1.3, P: -1.6, H: -3.2, E: -3.5,
  Q: -3.5, D: -3.5, N: -3.5, K: -3.9, R: -4.5,
};

const PKA = {
  nTerm: 9.69,
  cTerm: 2.34,
  D: 3.86,
  E: 4.25,
  C: 8.33,
  Y: 10.07,
  H: 6.00,
  K: 10.50,
  R: 12.50,
} as const;

function cleanSequence(input: string): string {
  const withoutFastaHeader = input
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('>'))
    .join('');
  return withoutFastaHeader.replace(/[\s0-9]/g, '').toUpperCase();
}

function netCharge(sequence: string, pH: number): number {
  const count = (aa: string) => sequence.split(aa).length - 1;
  const positive = 1 / (1 + 10 ** (pH - PKA.nTerm))
    + count('K') / (1 + 10 ** (pH - PKA.K))
    + count('R') / (1 + 10 ** (pH - PKA.R))
    + count('H') / (1 + 10 ** (pH - PKA.H));
  const negative = 1 / (1 + 10 ** (PKA.cTerm - pH))
    + count('D') / (1 + 10 ** (PKA.D - pH))
    + count('E') / (1 + 10 ** (PKA.E - pH))
    + count('C') / (1 + 10 ** (PKA.C - pH))
    + count('Y') / (1 + 10 ** (PKA.Y - pH));
  return positive - negative;
}

function calculateTheoreticalPi(sequence: string): number {
  let low = 0;
  let high = 14;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (netCharge(sequence, mid) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function calculateProteinSequenceFeatures(input: string): ProteinSequenceFeatures {
  if (typeof input !== 'string') throw new TypeError('Protein sequence must be a string');
  const sequence = cleanSequence(input);
  if (sequence.length === 0) throw new Error('Protein sequence is empty');
  if (sequence.length > 10000) throw new Error('Protein sequence exceeds the 10,000-residue limit');

  const invalid = [...new Set([...sequence].filter((aa) => !AMINO_ACIDS.includes(aa)))];
  if (invalid.length > 0) {
    throw new Error(`Unsupported amino-acid symbol(s): ${invalid.join(', ')}. Use the 20 standard amino acids.`);
  }

  const composition: Record<string, number> = Object.fromEntries([...AMINO_ACIDS].map((aa) => [aa, 0]));
  let mass = 18.01528; // one terminal H2O for the complete polypeptide
  let hydropathySum = 0;
  for (const aa of sequence) {
    composition[aa] += 1;
    mass += RESIDUE_MASS_DA[aa];
    hydropathySum += KYTE_DOOLITTLE[aa];
  }

  return {
    status: 'computed',
    method: 'primary-sequence-features-v1',
    sequenceLength: sequence.length,
    molecularMassDa: Number(mass.toFixed(3)),
    gravy: Number((hydropathySum / sequence.length).toFixed(4)),
    theoreticalPi: Number(calculateTheoreticalPi(sequence).toFixed(3)),
    composition,
    limitations: [
      'Primary-sequence features only; no 3D structure or folding pathway is computed.',
      'Theoretical pI depends on fixed approximate pKa values and may differ from experimental measurements.',
      'Mass assumes an unmodified, linear polypeptide; post-translational modifications, disulfide-linked mass changes, and bound ligands are not included.',
      'GRAVY is a sequence-average hydropathy descriptor, not a solubility or aggregation prediction.',
    ],
  };
}
