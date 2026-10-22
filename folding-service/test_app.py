import os
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import app as service_module
from app import app, normalize_sequence, pdb_ca_sequence

KEY = "test-service-key-" + ("x" * 32)
UBIQUITIN_SEQUENCE = "MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG"
UBIQUITIN_PDB = (Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "1ubq.pdb").read_text(encoding="utf-8")


class FoldingServiceTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.env_patch = patch.dict(os.environ, {"FOLDING_SERVICE_API_KEY": KEY}, clear=False)
        self.env_patch.start()

    def tearDown(self):
        self.env_patch.stop()
        self.client.close()

    def test_normalizes_fasta_and_rejects_invalid_or_oversized_sequences(self):
        self.assertEqual(normalize_sequence(">protein\nACD EFG"), "ACDEFG")
        with self.assertRaises(ValueError):
            normalize_sequence("ACDX")
        with self.assertRaises(ValueError):
            normalize_sequence("A" * 769)
        with self.assertRaises(ValueError):
            normalize_sequence(" ")

    def test_public_ubiquitin_fixture_has_expected_sequence(self):
        self.assertEqual(len(UBIQUITIN_SEQUENCE), 76)
        self.assertEqual(pdb_ca_sequence(UBIQUITIN_PDB), UBIQUITIN_SEQUENCE)

    def test_requires_configured_api_key(self):
        with patch.dict(os.environ, {"FOLDING_SERVICE_API_KEY": ""}, clear=False):
            response = self.client.post("/predict", content=UBIQUITIN_SEQUENCE)
        self.assertEqual(response.status_code, 503)

    def test_rejects_missing_or_invalid_bearer_token(self):
        response = self.client.post("/predict", content=UBIQUITIN_SEQUENCE)
        self.assertEqual(response.status_code, 401)
        response = self.client.post(
            "/predict",
            content=UBIQUITIN_SEQUENCE,
            headers={"Authorization": "Bearer wrong-key"},
        )
        self.assertEqual(response.status_code, 401)

    def test_returns_pdb_from_mocked_model_after_sequence_validation(self):
        with patch.object(service_module, "infer_pdb", return_value=UBIQUITIN_PDB) as mocked:
            response = self.client.post(
                "/predict",
                content=UBIQUITIN_SEQUENCE,
                headers={"Authorization": "Bearer " + KEY, "Content-Type": "text/plain"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn("ATOM", response.text)
        self.assertEqual(response.headers.get("X-Folding-Model"), "esmfold_v1")
        mocked.assert_called_once_with(UBIQUITIN_SEQUENCE)

    def test_rejects_model_output_with_mismatched_sequence(self):
        with patch.object(service_module, "infer_pdb", return_value=UBIQUITIN_PDB):
            response = self.client.post(
                "/predict",
                content="ACDEFG",
                headers={"Authorization": "Bearer " + KEY},
            )
        self.assertEqual(response.status_code, 502)

    def test_rejects_oversized_request_body(self):
        response = self.client.post(
            "/predict",
            content="A" * 9000,
            headers={"Authorization": "Bearer " + KEY},
        )
        self.assertEqual(response.status_code, 413)


    def test_liveness_and_readiness_are_distinct(self):
        service_module.MODEL = None
        self.assertEqual(self.client.get("/healthz").status_code, 200)
        response = self.client.get("/readyz")
        self.assertEqual(response.status_code, 503)
        self.assertFalse(response.json()["ready"])
        service_module.MODEL = object()
        try:
            response = self.client.get("/readyz")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["ready"])
        finally:
            service_module.MODEL = None

    def test_rejects_multichain_pdb_output(self):
        ca_lines = []
        seen_residues = set()
        for line in UBIQUITIN_PDB.splitlines():
            if not line.startswith("ATOM") or line[12:16].strip() != "CA" or line[16:17] not in (" ", "A"):
                continue
            residue_key = (line[22:26], line[26:27])
            if residue_key in seen_residues:
                continue
            seen_residues.add(residue_key)
            ca_lines.append(line)
            if len(ca_lines) == 2:
                break
        self.assertEqual(len(ca_lines), 2)
        two_chain_pdb = "\\n".join([
            ca_lines[0][:21] + "A" + ca_lines[0][22:],
            ca_lines[1][:21] + "B" + ca_lines[1][22:],
            "END",
        ])
        with self.assertRaisesRegex(ValueError, "single-chain"):
            pdb_ca_sequence(two_chain_pdb)

    def test_rejects_malformed_coordinate_fields(self):
        line = next(line for line in UBIQUITIN_PDB.splitlines() if line.startswith("ATOM") and line[12:16].strip() == "CA")
        malformed = line[:30] + "   BAD  " + line[38:]
        with self.assertRaisesRegex(ValueError, "invalid C-alpha coordinates"):
            pdb_ca_sequence(malformed)

    def test_maps_inference_exception_to_service_unavailable(self):
        with patch.object(service_module, "infer_pdb", side_effect=RuntimeError("private backend detail")):
            response = self.client.post(
                "/predict",
                content=UBIQUITIN_SEQUENCE,
                headers={"Authorization": "Bearer " + KEY},
            )
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private backend detail", response.text)

    def test_rejects_non_utf8_request(self):
        response = self.client.post(
            "/predict",
            content=b"\\xff\\xfe",
            headers={"Authorization": "Bearer " + KEY},
        )
        self.assertEqual(response.status_code, 400)


    def test_rejects_inference_overload_with_retry_after(self):
        class FullCapacity:
            def acquire(self, blocking=False):
                return False

            def release(self):
                raise AssertionError("release must not run when a slot was not acquired")

        with patch.object(service_module, "INFLIGHT_SLOTS", FullCapacity()):
            response = self.client.post(
                "/predict",
                content=UBIQUITIN_SEQUENCE,
                headers={"Authorization": "Bearer " + KEY},
            )
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers.get("Retry-After"), "2")


if __name__ == "__main__":
    unittest.main()
