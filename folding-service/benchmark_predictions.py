#!/usr/bin/env python3
"""Transparent sequence-mapped C-alpha benchmark for predicted protein structures.

This is a screening harness, not a substitute for TM-align/US-align or independent
scientific review. It reports global-fit C-alpha RMSD and threshold fractions; it
does not label those fractions as GDT-TS or compute TM-score.
"""

import argparse
import csv
import json
import math
import statistics
import sys
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import Bio
import numpy as np
from Bio.Align import PairwiseAligner, substitution_matrices
from Bio.PDB import PDBParser, Superimposer
from Bio.SeqUtils import seq1

STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")
THRESHOLDS_ANGSTROM = (2.0, 5.0, 10.0)
METHOD_VERSION = "sequence-mapped-global-ca-fit-v1"


class BenchmarkError(ValueError):
    """Raised when a benchmark target cannot be evaluated without guessing."""


def normalize_sequence(raw: str) -> str:
    lines = [line for line in raw.splitlines() if not line.strip().startswith(">")]
    sequence = "".join("".join(lines).split()).upper()
    if not sequence:
        raise BenchmarkError("Target sequence is empty.")
    invalid = sorted(set(sequence) - STANDARD_AA)
    if invalid:
        raise BenchmarkError("Target sequence contains unsupported symbols: " + ", ".join(invalid))
    return sequence


def _chain_ca_data(pdb_path: Path, chain_id: Optional[str]) -> Tuple[str, List[object], List[float], str]:
    parser = PDBParser(QUIET=True)
    try:
        structure = parser.get_structure(pdb_path.stem, str(pdb_path))
        model = next(structure.get_models())
    except Exception as error:
        raise BenchmarkError("Could not parse PDB: " + str(pdb_path)) from error

    available = []
    for chain in model:
        residues = []
        sequence_chars = []
        atoms = []
        bfactors = []
        for residue in chain:
            if "CA" not in residue:
                continue
            aa = seq1(residue.get_resname().upper(), custom_map={"MSE": "M"})
            if aa not in STANDARD_AA:
                continue
            atom = residue["CA"]
            coord = np.asarray(atom.coord, dtype=float)
            if coord.shape != (3,) or not np.isfinite(coord).all():
                raise BenchmarkError("PDB contains non-finite C-alpha coordinates: " + str(pdb_path))
            residues.append(residue)
            sequence_chars.append(aa)
            atoms.append(atom)
            bfactors.append(float(atom.get_bfactor()))
        if atoms:
            available.append((chain.id, "".join(sequence_chars), atoms, bfactors))

    if chain_id is not None:
        selected = [item for item in available if item[0] == chain_id]
        if not selected:
            raise BenchmarkError("Requested chain " + repr(chain_id) + " has no standard C-alpha residues in " + str(pdb_path))
        if len(selected) != 1:
            raise BenchmarkError("Chain selection is ambiguous in " + str(pdb_path))
    else:
        if len(available) != 1:
            raise BenchmarkError(
                "PDB must contain exactly one chain with standard C-alpha residues, or provide an explicit chain ID: "
                + str(pdb_path)
            )
        selected = available

    selected_chain, sequence, atoms, bfactors = selected[0]
    return sequence, atoms, bfactors, selected_chain


def _alignment_pairs(reference_sequence: str, predicted_sequence: str) -> Tuple[List[Tuple[int, int]], int]:
    aligner = PairwiseAligner()
    aligner.mode = "global"
    aligner.substitution_matrix = substitution_matrices.load("BLOSUM62")
    aligner.open_gap_score = -10.0
    aligner.extend_gap_score = -0.5
    alignments = aligner.align(reference_sequence, predicted_sequence)
    if len(alignments) == 0:
        raise BenchmarkError("Could not align reference and predicted sequences.")
    alignment = alignments[0]
    indices = alignment.indices
    pairs = []
    paired_alignment_columns = 0
    for reference_index, predicted_index in zip(indices[0], indices[1]):
        if reference_index >= 0 and predicted_index >= 0:
            paired_alignment_columns += 1
            if reference_sequence[reference_index] == predicted_sequence[predicted_index]:
                pairs.append((int(reference_index), int(predicted_index)))
    return pairs, paired_alignment_columns


def evaluate_pair(
    target_id: str,
    target_sequence: str,
    reference_pdb: Path,
    predicted_pdb: Path,
    provider: str,
    model_id: str,
    prediction_method: str,
    prediction_date: Optional[str] = None,
    reference_chain: Optional[str] = None,
    predicted_chain: Optional[str] = None,
) -> Dict[str, object]:
    sequence = normalize_sequence(target_sequence)
    if not provider.strip() or not model_id.strip() or not prediction_method.strip():
        raise BenchmarkError("Provider, model_id, and prediction_method are required provenance fields.")
    predicted_sequence, predicted_atoms, predicted_bfactors, predicted_chain_used = _chain_ca_data(
        predicted_pdb, predicted_chain
    )
    reference_sequence, reference_atoms, _, reference_chain_used = _chain_ca_data(reference_pdb, reference_chain)

    if predicted_sequence != sequence:
        raise BenchmarkError(
            "Predicted PDB sequence mismatch for "
            + target_id
            + ": expected "
            + str(len(sequence))
            + " residues, observed "
            + str(len(predicted_sequence))
            + "."
        )

    pairs, paired_alignment_columns = _alignment_pairs(reference_sequence, predicted_sequence)
    if len(pairs) < 3:
        raise BenchmarkError(
            "Fewer than three identical sequence-mapped C-alpha pairs for target " + target_id
        )

    reference_ca = [reference_atoms[reference_index] for reference_index, _ in pairs]
    predicted_ca = [predicted_atoms[predicted_index] for _, predicted_index in pairs]
    reference_coordinates = np.asarray([atom.coord for atom in reference_ca], dtype=float)
    predicted_coordinates = np.asarray([atom.coord for atom in predicted_ca], dtype=float)

    fit = Superimposer()
    fit.set_atoms(reference_ca, predicted_ca)
    rotation, translation = fit.rotran
    aligned_prediction = np.dot(predicted_coordinates, rotation) + translation
    distances = np.linalg.norm(reference_coordinates - aligned_prediction, axis=1)
    if not np.isfinite(distances).all():
        raise BenchmarkError("Non-finite aligned distances for target " + target_id)

    matched = len(pairs)
    reference_coverage = matched / len(reference_atoms)
    prediction_coverage = matched / len(predicted_atoms)
    sequence_identity = matched / paired_alignment_columns if paired_alignment_columns else 0.0
    row: Dict[str, object] = {
        "target_id": target_id,
        "provider": provider.strip(),
        "model_id": model_id.strip(),
        "prediction_method": prediction_method.strip(),
        "prediction_date": (prediction_date or "").strip(),
        "method_version": METHOD_VERSION,
        "input_sequence_length": len(sequence),
        "reference_ca_residue_count": len(reference_atoms),
        "predicted_ca_residue_count": len(predicted_atoms),
        "matched_identical_ca_pairs": matched,
        "reference_ca_coverage": round(reference_coverage, 6),
        "prediction_ca_coverage": round(prediction_coverage, 6),
        "sequence_identity_over_paired_alignment": round(sequence_identity, 6),
        "aligned_ca_rmsd_angstrom": round(float(fit.rms), 6),
        "mean_aligned_ca_distance_angstrom": round(float(np.mean(distances)), 6),
        "median_aligned_ca_distance_angstrom": round(float(np.median(distances)), 6),
        "mean_predicted_ca_bfactor": round(float(statistics.mean(predicted_bfactors[predicted_index] for _, predicted_index in pairs)), 4),
        "reference_chain": reference_chain_used,
        "predicted_chain": predicted_chain_used,
        "reference_pdb_sha256": _sha256_file(reference_pdb),
        "predicted_pdb_sha256": _sha256_file(predicted_pdb),
    }
    for threshold in THRESHOLDS_ANGSTROM:
        row["fraction_within_" + str(int(threshold)) + "A_after_global_fit"] = round(
            float(np.mean(distances <= threshold)), 6
        )
    return row


def _sha256_file(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _manifest_path(base_dir: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (base_dir / path).resolve()


def run_benchmark(manifest_path: Path, output_csv: Path, summary_json: Path) -> Dict[str, object]:
    base_dir = manifest_path.resolve().parent
    rows: List[Dict[str, object]] = []
    with manifest_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"target_id", "sequence", "reference_pdb", "predicted_pdb", "provider", "model_id", "prediction_method"}
        if reader.fieldnames is None or not required.issubset(set(reader.fieldnames)):
            raise BenchmarkError(
                "Manifest must contain columns: target_id, sequence, reference_pdb, predicted_pdb; "
                "optional: reference_chain, predicted_chain."
            )
        for line_number, record in enumerate(reader, start=2):
            target_id = (record.get("target_id") or "").strip()
            if not target_id:
                raise BenchmarkError("Manifest line " + str(line_number) + " has an empty target_id.")
            reference_pdb = _manifest_path(base_dir, record["reference_pdb"])
            predicted_pdb = _manifest_path(base_dir, record["predicted_pdb"])
            if not reference_pdb.is_file() or not predicted_pdb.is_file():
                raise BenchmarkError("Missing reference or prediction PDB for target " + target_id)
            rows.append(
                evaluate_pair(
                    target_id=target_id,
                    target_sequence=record["sequence"],
                    reference_pdb=reference_pdb,
                    predicted_pdb=predicted_pdb,
                    provider=record["provider"],
                    model_id=record["model_id"],
                    prediction_method=record["prediction_method"],
                    prediction_date=record.get("prediction_date"),
                    reference_chain=(record.get("reference_chain") or "").strip() or None,
                    predicted_chain=(record.get("predicted_chain") or "").strip() or None,
                )
            )

    if not rows:
        raise BenchmarkError("Manifest contains no benchmark targets.")

    model_provenance = {
        (str(row["provider"]), str(row["model_id"]), str(row["prediction_method"]))
        for row in rows
    }
    if len(model_provenance) != 1:
        raise BenchmarkError("One manifest must evaluate exactly one provider/model/method version; use separate manifests for model comparisons.")

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    rmsds = [float(row["aligned_ca_rmsd_angstrom"]) for row in rows]
    summary: Dict[str, object] = {
        "method_version": METHOD_VERSION,
        "biopython_version": Bio.__version__,
        "provider": rows[0]["provider"],
        "model_id": rows[0]["model_id"],
        "prediction_method": rows[0]["prediction_method"],
        "prediction_date": rows[0]["prediction_date"],
        "manifest_sha256": _sha256_file(manifest_path),
        "results_csv_sha256": _sha256_file(output_csv),
        "target_count": len(rows),
        "mean_aligned_ca_rmsd_angstrom": round(statistics.mean(rmsds), 6),
        "median_aligned_ca_rmsd_angstrom": round(statistics.median(rmsds), 6),
        "max_aligned_ca_rmsd_angstrom": round(max(rmsds), 6),
        "metric_notes": [
            "RMSD uses sequence-mapped C-alpha atoms and one global least-squares superposition.",
            "Distance-threshold fractions use that same global fit; they are not GDT-TS.",
            "This script does not compute TM-score. Use TM-align or US-align for standard TM-score evaluation.",
            "Mean predicted C-alpha B-factor is reported without assuming it is calibrated confidence; interpret only according to the predictor's documented PDB convention.",
            "This harness does not establish experimental validity or clinical suitability.",
        ],
        "results_csv": str(output_csv),
    }
    summary_json.parent.mkdir(parents=True, exist_ok=True)
    summary_json.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return summary


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path, help="CSV manifest with target/reference/prediction paths")
    parser.add_argument("--output", required=True, type=Path, help="Per-target CSV output path")
    parser.add_argument("--summary", required=True, type=Path, help="Aggregate JSON summary path")
    args = parser.parse_args(argv)
    try:
        summary = run_benchmark(args.manifest, args.output, args.summary)
    except (BenchmarkError, OSError, csv.Error) as error:
        print("BENCHMARK ERROR:", error, file=sys.stderr)
        return 2
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
