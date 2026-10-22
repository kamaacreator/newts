import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "folding-service"))
from benchmark_predictions import BenchmarkError, evaluate_pair, run_benchmark  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "1ubq.pdb"
UBIQUITIN_SEQUENCE = "MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG"


def transform_pdb(text: str, perturb_first_ca: bool = False, omit_first_ca: bool = False) -> str:
    lines = []
    perturbed = False
    for line in text.splitlines():
        if line.startswith("ATOM") and len(line) >= 54:
            atom_name = line[12:16].strip()
            residue_number = line[22:26].strip()
            if omit_first_ca and atom_name == "CA" and residue_number == "1":
                continue
            x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
            nx, ny, nz = -y + 10.0, x - 5.0, z + 2.0
            if perturb_first_ca and atom_name == "CA" and residue_number == "1":
                nx += 5.0
                perturbed = True
            line = line[:30] + f"{nx:8.3f}{ny:8.3f}{nz:8.3f}" + line[54:]
        lines.append(line)
    return "\n".join(lines) + "\n"


class StructureBenchmarkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)
        self.reference = self.work / "reference.pdb"
        self.reference.write_text(FIXTURE.read_text(encoding="utf-8"), encoding="utf-8")
        self.prediction = self.work / "prediction.pdb"
        self.prediction.write_text(transform_pdb(FIXTURE.read_text(encoding="utf-8")), encoding="utf-8")

    def test_rigid_transform_has_near_zero_sequence_mapped_ca_rmsd(self):
        row = evaluate_pair(
            "1ubq-rigid",
            UBIQUITIN_SEQUENCE,
            self.reference,
            self.prediction,
        )
        self.assertEqual(row["matched_identical_ca_pairs"], 76)
        self.assertEqual(row["reference_ca_coverage"], 1.0)
        self.assertEqual(row["prediction_ca_coverage"], 1.0)
        self.assertEqual(row["sequence_identity_over_paired_alignment"], 1.0)
        self.assertLess(float(row["aligned_ca_rmsd_angstrom"]), 0.001)
        self.assertTrue(row["reference_pdb_sha256"])
        self.assertTrue(row["predicted_pdb_sha256"])

    def test_coordinate_perturbation_is_visible_in_benchmark_metrics(self):
        perturbed = self.work / "perturbed.pdb"
        perturbed.write_text(
            transform_pdb(FIXTURE.read_text(encoding="utf-8"), perturb_first_ca=True),
            encoding="utf-8",
        )
        row = evaluate_pair("1ubq-perturbed", UBIQUITIN_SEQUENCE, self.reference, perturbed)
        self.assertGreater(float(row["aligned_ca_rmsd_angstrom"]), 0.01)
        self.assertLess(float(row["fraction_within_2A_after_global_fit"]), 1.0)

    def test_prediction_sequence_mismatch_is_a_hard_error(self):
        missing_residue = self.work / "missing-ca.pdb"
        missing_residue.write_text(
            transform_pdb(FIXTURE.read_text(encoding="utf-8"), omit_first_ca=True),
            encoding="utf-8",
        )
        with self.assertRaisesRegex(BenchmarkError, "sequence mismatch"):
            evaluate_pair("1ubq-missing", UBIQUITIN_SEQUENCE, self.reference, missing_residue)

    def test_manifest_writes_per_target_csv_and_method_disclosed_summary(self):
        manifest = self.work / "manifest.csv"
        with manifest.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=["target_id", "sequence", "reference_pdb", "predicted_pdb"],
            )
            writer.writeheader()
            writer.writerow({
                "target_id": "1ubq",
                "sequence": UBIQUITIN_SEQUENCE,
                "reference_pdb": "reference.pdb",
                "predicted_pdb": "prediction.pdb",
            })
        output_csv = self.work / "results.csv"
        summary_json = self.work / "summary.json"
        summary = run_benchmark(manifest, output_csv, summary_json)
        with output_csv.open("r", encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual(len(rows), 1)
        self.assertEqual(summary["target_count"], 1)
        saved_summary = json.loads(summary_json.read_text(encoding="utf-8"))
        self.assertTrue(any("does not compute TM-score" in note for note in saved_summary["metric_notes"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
