import os
import re
import secrets
import threading
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse, JSONResponse
from starlette.concurrency import run_in_threadpool

MAX_SEQUENCE_LENGTH = 768
MAX_REQUEST_BYTES = 8192
MAX_PDB_BYTES = 2_000_000
STANDARD_AA = re.compile(r"^[ACDEFGHIKLMNPQRSTVWY]+$")
AA3_TO_1: Dict[str, str] = {
    "ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C",
    "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I",
    "LEU": "L", "LYS": "K", "MET": "M", "PHE": "F", "PRO": "P",
    "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V",
}

app = FastAPI(title="Aetheris ESMFold Inference Service", docs_url=None, redoc_url=None)
MODEL = None
TORCH = None
MODEL_LOCK = threading.Lock()
INFERENCE_LOCK = threading.Lock()


def normalize_sequence(raw: str) -> str:
    lines = [line for line in raw.splitlines() if not line.strip().startswith(">")]
    sequence = "".join("".join(lines).split()).upper()
    if not sequence:
        raise ValueError("Protein sequence is empty.")
    if len(sequence) > MAX_SEQUENCE_LENGTH:
        raise ValueError("Sequence exceeds the 768-residue service limit.")
    if not STANDARD_AA.fullmatch(sequence):
        raise ValueError("Use only the 20 standard amino acids.")
    return sequence


def pdb_ca_sequence(pdb_text: str) -> str:
    if not pdb_text or len(pdb_text.encode("utf-8")) > MAX_PDB_BYTES:
        raise ValueError("PDB output is empty or oversized.")

    residues = {}
    saw_model = False
    in_first_model = True

    for line in pdb_text.splitlines():
        record = line[:6].strip()
        if record == "MODEL":
            if not saw_model:
                saw_model = True
                in_first_model = True
            else:
                in_first_model = False
            continue
        if record == "ENDMDL" and saw_model and in_first_model:
            break
        if not in_first_model or record != "ATOM" or len(line) < 54:
            continue
        if line[12:16].strip() != "CA":
            continue

        alt_loc = line[16:17]
        if alt_loc not in (" ", "A"):
            continue
        residue_name = line[17:20].strip().upper()
        chain = line[21:22].strip() or "_"
        residue_number = line[22:26].strip()
        insertion_code = line[26:27].strip()
        try:
            if not re.fullmatch(r"[+-]?\d+", residue_number):
                raise ValueError()
            for start, end in ((30, 38), (38, 46), (46, 54)):
                if not re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)", line[start:end].strip()):
                    raise ValueError()
        except ValueError:
            raise ValueError("PDB output contains invalid C-alpha coordinates or residue numbering.")

        key = (chain, residue_number, insertion_code)
        existing = residues.get(key)
        if existing and existing[0] == " ":
            continue
        residues[key] = (alt_loc, residue_name)

    if not residues:
        raise ValueError("PDB output has no C-alpha ATOM records.")
    if len({key[0] for key in residues}) != 1:
        raise ValueError("Only single-chain predictions are supported by this endpoint.")

    ordered = sorted(residues.items(), key=lambda item: (item[0][0], int(item[0][1]), item[0][2]))
    try:
        sequence = "".join(AA3_TO_1[item[1][1]] for item in ordered)
    except KeyError as error:
        raise ValueError("PDB output contains an unsupported residue identity.") from error
    return sequence


def load_model():
    global MODEL, TORCH
    if MODEL is not None:
        return MODEL
    with MODEL_LOCK:
        if MODEL is not None:
            return MODEL
        import torch
        import esm

        device = os.getenv("FOLDING_DEVICE", "cuda").strip().lower()
        if device == "cuda" and not torch.cuda.is_available():
            raise RuntimeError("CUDA was requested but no CUDA device is available; set FOLDING_DEVICE=cpu only for development or CPU-capable hosts.")
        if device not in ("cuda", "cpu"):
            raise RuntimeError("FOLDING_DEVICE must be either 'cuda' or 'cpu'.")
        model = esm.pretrained.esmfold_v1().eval()
        chunk_size = int(os.getenv("FOLDING_CHUNK_SIZE", "64"))
        if chunk_size < 1 or chunk_size > 256:
            raise RuntimeError("FOLDING_CHUNK_SIZE must be between 1 and 256.")
        model.set_chunk_size(chunk_size)
        model = model.cuda() if device == "cuda" else model.to("cpu")
        TORCH = torch
        MODEL = model
        return MODEL


def infer_pdb(sequence: str) -> str:
    model = load_model()
    if TORCH is None:
        raise RuntimeError("Model runtime is not initialized.")
    with INFERENCE_LOCK:
        with TORCH.inference_mode():
            return model.infer_pdb(sequence)


@app.on_event("startup")
def startup_load_model():
    # Production container sets FOLDING_EAGER_LOAD=1 so readiness is meaningful.
    # Unit tests and lightweight local contract tests can leave lazy loading enabled.
    if os.getenv("FOLDING_EAGER_LOAD", "0").strip() == "1":
        load_model()


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    return JSONResponse(
        {"ready": MODEL is not None, "model_id": "esmfold_v1", "device": os.getenv("FOLDING_DEVICE", "cuda")},
        status_code=200 if MODEL is not None else 503,
    )


@app.post("/predict", response_class=PlainTextResponse)
async def predict(request: Request):
    expected_key = os.getenv("FOLDING_SERVICE_API_KEY", "")
    if len(expected_key) < 32:
        raise HTTPException(status_code=503, detail="Folding service API key is not configured.")
    supplied = request.headers.get("authorization", "")
    prefix = "Bearer "
    if not supplied.startswith(prefix) or not secrets.compare_digest(supplied[len(prefix):], expected_key):
        raise HTTPException(status_code=401, detail="Authentication required.")

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_BYTES:
                raise HTTPException(status_code=413, detail="Sequence request is too large.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length.")

    chunks = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_REQUEST_BYTES:
            raise HTTPException(status_code=413, detail="Sequence request is too large.")
        chunks.append(chunk)
    try:
        raw_sequence = b"".join(chunks).decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Sequence request must be UTF-8 text.")

    try:
        sequence = normalize_sequence(raw_sequence)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))

    try:
        pdb_text = await run_in_threadpool(infer_pdb, sequence)
    except Exception:
        # Avoid leaking model paths, dependency details, or provider internals.
        raise HTTPException(status_code=503, detail="ESMFold inference is unavailable; inspect the private service logs.")

    try:
        predicted_sequence = pdb_ca_sequence(pdb_text)
    except ValueError:
        raise HTTPException(status_code=502, detail="ESMFold returned an invalid PDB structure.")
    if predicted_sequence != sequence:
        raise HTTPException(status_code=502, detail="Predicted PDB sequence did not match the submitted sequence.")

    return PlainTextResponse(
        pdb_text,
        media_type="text/plain",
        headers={"X-Folding-Model": "esmfold_v1", "Cache-Control": "no-store"},
    )
