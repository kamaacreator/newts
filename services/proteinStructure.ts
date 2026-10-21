/**
 * Coordinate-based PDB structure descriptors.
 *
 * Parses C-alpha coordinates from the first model of a PDB text file and
 * calculates radius of gyration and nonlocal C-alpha contacts. This is
 * structure analysis only; it does not predict or repair a protein fold.
 */

export type ProteinStructureMetrics = {
  status: 'computed';
  method: 'pdb-ca-geometry-v1';
  atomSelection: 'ATOM CA, first model, alternate location blank/A';
  residueCount: number;
  chainCount: number;
  sequenceByChain: Record<string, string>;
  radiusOfGyrationAngstrom: number;
  nonlocalContactsAt8Angstrom: number;
  contactDefinition: string;
  limitations: string[];
};

const THREE_TO_ONE: Record<string, string> = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E',
  GLY: 'G', HIS: 'H', ILE: 'I', LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F',
  PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
  MSE: 'M',
};

type ResidueCoordinate = {
  chain: string;
  residueKey: string;
  residueNumber: number;
  insertionCode: string;
  residueName: string;
  x: number;
  y: number;
  z: number;
  chainOrder: number;
};

export function calculatePdbCaGeometry(pdbText: string): ProteinStructureMetrics {
  if (typeof pdbText !== 'string' || pdbText.trim().length === 0) {
    throw new Error('PDB text is empty');
  }
  if (pdbText.length > 2_000_000) throw new Error('PDB text exceeds the 2 MB limit');

  const lines = pdbText.split(/\r?\n/);
  const residues = new Map<string, ResidueCoordinate>();
  const chainCounters = new Map<string, number>();
  let sawModel = false;
  let inFirstModel = true;
  let atomLineCount = 0;

  for (const line of lines) {
    const record = line.slice(0, 6).trim();
    if (record === 'MODEL') {
      if (!sawModel) {
        sawModel = true;
        inFirstModel = true;
      } else {
        inFirstModel = false;
      }
      continue;
    }
    if (record === 'ENDMDL' && sawModel && inFirstModel) {
      inFirstModel = false;
      break;
    }
    if (!inFirstModel || record !== 'ATOM' || line.length < 54) continue;
    if (line.slice(12, 16).trim() !== 'CA') continue;
    const altLoc = line.slice(16, 17);
    if (altLoc !== ' ' && altLoc !== 'A') continue;

    atomLineCount += 1;
    const residueName = line.slice(17, 20).trim().toUpperCase();
    const chain = line.slice(21, 22).trim() || '_';
    const residueNumberText = line.slice(22, 26).trim();
    const insertionCode = line.slice(26, 27).trim();
    const x = Number(line.slice(30, 38).trim());
    const y = Number(line.slice(38, 46).trim());
    const z = Number(line.slice(46, 54).trim());
    const residueNumber = Number(residueNumberText);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(residueNumber)) {
      throw new Error('PDB contains invalid C-alpha coordinates or residue numbering');
    }

    const residueKey = `${chain}:${residueNumberText}:${insertionCode}`;
    const existing = residues.get(residueKey);
    // Blank alternate location is preferred over alternate A if both are present.
    if (existing && (existing as ResidueCoordinate & { altLoc?: string }).altLoc === ' ') continue;

    const chainOrder = chainCounters.get(chain) ?? 0;
    const coordinate: ResidueCoordinate & { altLoc?: string } = {
      chain, residueKey, residueNumber, insertionCode, residueName, x, y, z, chainOrder, altLoc,
    };
    residues.set(residueKey, coordinate);
    if (!existing) chainCounters.set(chain, chainOrder + 1);
  }

  if (atomLineCount === 0 || residues.size === 0) {
    throw new Error('No C-alpha ATOM records found in the first PDB model');
  }
  if (residues.size > 5000) throw new Error('Structure exceeds the 5,000-residue calculation limit');

  const points = [...residues.values()];
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const cz = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  const rgSquared = points.reduce((sum, p) => sum + (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2, 0) / points.length;

  const sequenceByChain: Record<string, string> = {};
  for (const point of points) {
    sequenceByChain[point.chain] = (sequenceByChain[point.chain] ?? '') + (THREE_TO_ONE[point.residueName] ?? 'X');
  }

  let contacts = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (a.chain === b.chain && Math.abs(a.chainOrder - b.chainOrder) <= 3) continue;
      const distanceSquared = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (distanceSquared < 64) contacts += 1;
    }
  }

  return {
    status: 'computed',
    method: 'pdb-ca-geometry-v1',
    atomSelection: 'ATOM CA, first model, alternate location blank/A',
    residueCount: points.length,
    chainCount: new Set(points.map((point) => point.chain)).size,
    sequenceByChain,
    radiusOfGyrationAngstrom: Number(Math.sqrt(rgSquared).toFixed(3)),
    nonlocalContactsAt8Angstrom: contacts,
    contactDefinition: 'Unique C-alpha pairs below 8.0 Å, excluding same-chain pairs separated by 3 or fewer C-alpha positions.',
    limitations: [
      'Geometry is computed from the supplied coordinates; the structure is not predicted or validated by this function.',
      'Only C-alpha atoms from the first PDB model are used; hydrogen atoms, side chains, ligands, and solvent are ignored.',
      'Non-standard residue names are represented as X in the derived sequence unless explicitly mapped.',
      'This is not an energy, stability, docking, dynamics, or folding calculation.',
    ],
  };
}
