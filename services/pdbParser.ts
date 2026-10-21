export type PdbCaAtom = {
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

export const THREE_TO_ONE: Record<string, string> = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E',
  GLY: 'G', HIS: 'H', ILE: 'I', LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F',
  PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
  MSE: 'M',
};

/** Parse one C-alpha coordinate per residue from the first PDB model. */
export function parsePdbCaAtoms(pdbText: string): PdbCaAtom[] {
  if (typeof pdbText !== 'string' || pdbText.trim().length === 0) throw new Error('PDB text is empty');
  if (pdbText.length > 2_000_000) throw new Error('PDB text exceeds the 2 MB limit');

  const residues = new Map<string, PdbCaAtom & { altLoc?: string }>();
  const chainCounters = new Map<string, number>();
  let sawModel = false;
  let inFirstModel = true;
  let atomLineCount = 0;

  for (const line of pdbText.split(/\r?\n/)) {
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
    if (record === 'ENDMDL' && sawModel && inFirstModel) break;
    if (!inFirstModel || record !== 'ATOM' || line.length < 54) continue;
    if (line.slice(12, 16).trim() !== 'CA') continue;

    const altLoc = line.slice(16, 17);
    if (altLoc !== ' ' && altLoc !== 'A') continue;
    atomLineCount += 1;

    const residueName = line.slice(17, 20).trim().toUpperCase();
    const chain = line.slice(21, 22).trim() || '_';
    const residueNumberText = line.slice(22, 26).trim();
    const insertionCode = line.slice(26, 27).trim();
    const xText = line.slice(30, 38).trim();
    const yText = line.slice(38, 46).trim();
    const zText = line.slice(46, 54).trim();
    const coordinatePattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
    if (
      !/^[+-]?\d+$/.test(residueNumberText) ||
      !coordinatePattern.test(xText) ||
      !coordinatePattern.test(yText) ||
      !coordinatePattern.test(zText)
    ) {
      throw new Error('PDB contains invalid or missing C-alpha coordinates or residue numbering');
    }
    const x = Number(xText);
    const y = Number(yText);
    const z = Number(zText);
    const residueNumber = Number(residueNumberText);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isSafeInteger(residueNumber)) {
      throw new Error('PDB contains invalid C-alpha coordinates or residue numbering');
    }

    const residueKey = `${chain}:${residueNumberText}:${insertionCode}`;
    const existing = residues.get(residueKey);
    // Prefer blank alternate location over A when both exist.
    if (existing && existing.altLoc === ' ') continue;
    const chainOrder = existing?.chainOrder ?? chainCounters.get(chain) ?? 0;
    residues.set(residueKey, {
      chain, residueKey, residueNumber, insertionCode, residueName,
      x, y, z, chainOrder, altLoc,
    });
    if (!existing) chainCounters.set(chain, chainOrder + 1);
  }

  if (atomLineCount === 0 || residues.size === 0) {
    throw new Error('No C-alpha ATOM records found in the first PDB model');
  }
  if (residues.size > 5000) throw new Error('Structure exceeds the 5,000-residue calculation limit');
  return [...residues.values()].map(({ altLoc: _altLoc, ...atom }) => atom);
}
