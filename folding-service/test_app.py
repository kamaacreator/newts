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


if __name__ == "__main__":
    unittest.main()
