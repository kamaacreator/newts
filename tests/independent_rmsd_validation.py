#!/usr/bin/env python3
"""Cross-check the TypeScript Horn RMSD against Biopython's independent Kabsch fit."""

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from Bio.PDB import PDBParser, Superimposer

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "1ubq.pdb"
CLI = ROOT / "tests" / "rmsd-cli.ts"


def transform_pdb(text: str, perturb_first_ca: bool = False) -> str:
    transformed = []
    perturbed = False
    for line in text.splitlines():
        if line.startswith("ATOM") and line[12:16].strip() == "CA" and len(line) >= 54:
            x = float(line[30:38])
            y = float(line[38:46])
            z = float(line[46:54])
            nx, ny, nz = -y + 10.0, x - 5.0, z + 2.0
            if perturb_first_ca and not perturbed:
                nx += 1.0
                perturbed = True
            line = line[:30] + f"{nx:8.3f}{ny:8.3f}{nz:8.3f}" + line[54:]
        transformed.append(line)
    if perturb_first_ca and not perturbed:
        raise AssertionError("Fixture has no C-alpha coordinates")
    return "\n".join(transformed) + "\n"


def independent_biopython_rmsd(mobile_path: Path, reference_path: Path) -> float:
    parser = PDBParser(QUIET=True)
    mobile = parser.get_structure("mobile", str(mobile_path))
    reference = parser.get_structure("reference", str(reference_path))
    mobile_ca = [atom for atom in mobile[0].get_atoms() if atom.get_id() == "CA" and atom.element == "C"]
    reference_ca = [atom for atom in reference[0].get_atoms() if atom.get_id() == "CA" and atom.element == "C"]
    if len(mobile_ca) != len(reference_ca):
        raise AssertionError(f"Atom count mismatch: mobile={len(mobile_ca)}, reference={len(reference_ca)}")
    fit = Superimposer()
    fit.set_atoms(reference_ca, mobile_ca)
    return float(fit.rms)


def typescript_rmsd(mobile_path: Path, reference_path: Path) -> float:
    completed = subprocess.run(
        ["node", "--import", "tsx", str(CLI), str(mobile_path), str(reference_path)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return float(json.loads(completed.stdout)["alignedCaRmsdAngstrom"])


class IndependentRmsdValidation(unittest.TestCase):
    def setUp(self):
        self.reference_text = FIXTURE.read_text(encoding="utf-8")
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.tmp = Path(self.temp_dir.name)
        self.reference_path = self.tmp / "reference.pdb"
        self.reference_path.write_text(self.reference_text, encoding="utf-8")

    def compare_methods(self, mobile_text: str) -> tuple[float, float]:
        mobile_path = self.tmp / "mobile.pdb"
        mobile_path.write_text(mobile_text, encoding="utf-8")
        independent = independent_biopython_rmsd(mobile_path, self.reference_path)
        implementation = typescript_rmsd(mobile_path, self.reference_path)
        self.assertLessEqual(
            abs(independent - implementation),
            0.01,
            f"TypeScript RMSD {implementation:.4f} Å disagrees with Biopython {independent:.6f} Å",
        )
        return independent, implementation

    def test_rigid_body_transform_agrees_with_independent_alignment(self):
        independent, implementation = self.compare_methods(transform_pdb(self.reference_text))
        self.assertLess(independent, 0.001)
        self.assertLess(implementation, 0.001)

    def test_coordinate_perturbation_agrees_with_independent_alignment(self):
        independent, implementation = self.compare_methods(transform_pdb(self.reference_text, perturb_first_ca=True))
        self.assertGreater(independent, 0.01)
        self.assertGreater(implementation, 0.01)


if __name__ == "__main__":
    unittest.main(verbosity=2)
