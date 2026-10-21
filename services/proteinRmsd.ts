import { parsePdbCaAtoms } from './pdbParser.ts';

export type AlignedCaRmsdResult = {
  status: 'computed';
  method: 'horn-quaternion-superposition-ca-rmsd-v1';
  alignedCaRmsdAngstrom: number;
  matchedResidueCount: number;
  unmatchedMobileResidueCount: number;
  unmatchedReferenceResidueCount: number;
  residueMapping: string;
  limitations: string[];
};

type Point = { x: number; y: number; z: number };

function centroid(points: Point[]): Point {
  return points.reduce((sum, point) => ({
    x: sum.x + point.x / points.length,
    y: sum.y + point.y / points.length,
    z: sum.z + point.z / points.length,
  }), { x: 0, y: 0, z: 0 });
}

function jacobiLargestEigenvector(input: number[][]): number[] {
  const a = input.map((row) => [...row]);
  const n = a.length;
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));

  for (let iteration = 0; iteration < 100; iteration += 1) {
    let p = 0;
    let q = 1;
    let largest = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        if (Math.abs(a[i][j]) > largest) {
          largest = Math.abs(a[i][j]);
          p = i;
          q = j;
        }
      }
    }
    if (largest < 1e-13) break;

    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let k = 0; k < n; k += 1) {
      if (k !== p && k !== q) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[p][k] = a[k][p];
        a[k][q] = s * akp + c * akq;
        a[q][k] = a[k][q];
      }
      const vkp = v[k][p];
      const vkq = v[k][q];
      v[k][p] = c * vkp - s * vkq;
      v[k][q] = s * vkp + c * vkq;
    }
  }

  let maxIndex = 0;
  for (let i = 1; i < n; i += 1) if (a[i][i] > a[maxIndex][maxIndex]) maxIndex = i;
  const vector = v.map((row) => row[maxIndex]);
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return vector.map((value) => value / norm);
}

function optimalRotation(mobile: Point[], reference: Point[]): number[][] {
  const s = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < mobile.length; i += 1) {
    const p = mobile[i];
    const q = reference[i];
    const pv = [p.x, p.y, p.z];
    const qv = [q.x, q.y, q.z];
    for (let r = 0; r < 3; r += 1) {
      for (let col = 0; col < 3; col += 1) s[r][col] += pv[r] * qv[col];
    }
  }

  const sxx = s[0][0], sxy = s[0][1], sxz = s[0][2];
  const syx = s[1][0], syy = s[1][1], syz = s[1][2];
  const szx = s[2][0], szy = s[2][1], szz = s[2][2];
  const n = [
    [sxx + syy + szz, syz - szy, szx - sxz, sxy - syx],
    [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz],
    [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy],
    [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz],
  ];
  const [w, x, y, z] = jacobiLargestEigenvector(n);

  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/**
 * Computes least-squares superposed C-alpha RMSD using Horn's quaternion
 * solution to the optimal rigid rotation problem. Residues are matched by
 * exact chain, residue number, insertion code, and residue name.
 */
export function calculateAlignedCaRmsd(mobilePdbText: string, referencePdbText: string): AlignedCaRmsdResult {
  const mobileAtoms = parsePdbCaAtoms(mobilePdbText);
  const referenceAtoms = parsePdbCaAtoms(referencePdbText);
  const referenceByKey = new Map(referenceAtoms.map((atom) => [atom.residueKey, atom]));
  const mobileByKey = new Map(mobileAtoms.map((atom) => [atom.residueKey, atom]));

  const matchedMobile: Point[] = [];
  const matchedReference: Point[] = [];
  for (const mobile of mobileAtoms) {
    const reference = referenceByKey.get(mobile.residueKey);
    if (!reference || reference.residueName !== mobile.residueName) continue;
    matchedMobile.push({ x: mobile.x, y: mobile.y, z: mobile.z });
    matchedReference.push({ x: reference.x, y: reference.y, z: reference.z });
  }

  if (matchedMobile.length < 3) {
    throw new Error('At least three matching C-alpha residues are required for aligned RMSD');
  }

  const mobileCenter = centroid(matchedMobile);
  const referenceCenter = centroid(matchedReference);
  const centeredMobile = matchedMobile.map((p) => ({
    x: p.x - mobileCenter.x, y: p.y - mobileCenter.y, z: p.z - mobileCenter.z,
  }));
  const centeredReference = matchedReference.map((p) => ({
    x: p.x - referenceCenter.x, y: p.y - referenceCenter.y, z: p.z - referenceCenter.z,
  }));

  const rotation = optimalRotation(centeredMobile, centeredReference);
  let squaredError = 0;
  for (let i = 0; i < centeredMobile.length; i += 1) {
    const p = centeredMobile[i];
    const q = centeredReference[i];
    const rx = rotation[0][0] * p.x + rotation[0][1] * p.y + rotation[0][2] * p.z;
    const ry = rotation[1][0] * p.x + rotation[1][1] * p.y + rotation[1][2] * p.z;
    const rz = rotation[2][0] * p.x + rotation[2][1] * p.y + rotation[2][2] * p.z;
    squaredError += (rx - q.x) ** 2 + (ry - q.y) ** 2 + (rz - q.z) ** 2;
  }

  const matchedKeys = new Set(mobileAtoms.filter((atom) => {
    const reference = referenceByKey.get(atom.residueKey);
    return Boolean(reference && reference.residueName === atom.residueName);
  }).map((atom) => atom.residueKey));

  return {
    status: 'computed',
    method: 'horn-quaternion-superposition-ca-rmsd-v1',
    alignedCaRmsdAngstrom: Number(Math.sqrt(squaredError / matchedMobile.length).toFixed(4)),
    matchedResidueCount: matchedMobile.length,
    unmatchedMobileResidueCount: mobileAtoms.filter((atom) => !matchedKeys.has(atom.residueKey)).length,
    unmatchedReferenceResidueCount: referenceAtoms.filter((atom) => !matchedKeys.has(atom.residueKey)).length,
    residueMapping: 'Exact chain + residue number + insertion code + residue name; unmatched residues excluded.',
    limitations: [
      'RMSD compares supplied structures after optimal rigid-body superposition; it does not predict a fold.',
      'Only first-model C-alpha coordinates are used; side chains and atom-level geometry are ignored.',
      'Residues with missing or mismatched identities are excluded rather than sequence-aligned.',
      'Interpretation depends on atom selection and residue mapping; this value alone is not a complete structural-quality score.',
    ],
  };
}
