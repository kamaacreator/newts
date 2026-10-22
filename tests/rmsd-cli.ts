import { readFileSync } from 'node:fs';
import { calculateAlignedCaRmsd } from '../services/proteinRmsd.ts';

const mobilePath = process.argv[2];
const referencePath = process.argv[3];
if (!mobilePath || !referencePath) {
  process.stderr.write('Usage: rmsd-cli.ts <mobile.pdb> <reference.pdb>\\n');
  process.exit(2);
}

const result = calculateAlignedCaRmsd(
  readFileSync(mobilePath, 'utf8'),
  readFileSync(referencePath, 'utf8'),
);
process.stdout.write(JSON.stringify(result));
