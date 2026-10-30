# Self-hosted ESMFold v1 inference service

This optional sidecar implements the raw-text/PDB contract expected by Aetheris at `POST /api/agent/protein/fold`. It runs the actual `esm.pretrained.esmfold_v1()` model rather than a heuristic.

## Requirements

- NVIDIA GPU with a compatible CUDA driver is recommended.
- Docker image uses the PyTorch 2.0.0 CUDA 11.7 development image, with explicit ESM/OpenFold/dllogger pins and NumPy constrained below 2. The exact toolchain remains subject to the container-build CI and target-GPU smoke test.
- First inference downloads model weights unless the Torch cache is pre-populated. Plan for several gigabytes of image, dependencies, and model cache, plus sufficient GPU VRAM.
- The default request limit is 768 standard amino-acid residues. The service serializes actual model inference and caps in-flight requests at two; additional requests receive HTTP 429 with Retry-After rather than accumulating without bound.

## Build and run privately

Build the image:

```bash
docker build -t aetheris-esmfold:local folding-service
```

Generate a separate random API key and run the service on a private network. Do not expose port 8080 directly to the public internet.

```bash
export FOLDING_SERVICE_API_KEY="$(openssl rand -hex 32)"
docker run --rm --gpus all \
  -e FOLDING_SERVICE_API_KEY="$FOLDING_SERVICE_API_KEY" \
  -e FOLDING_DEVICE=cuda \
  -e FOLDING_CHUNK_SIZE=64 \
  -p 127.0.0.1:8080:8080 \
  -v aetheris-esmfold-cache:/models \
  aetheris-esmfold:local
```

For a same-host local development instance only, configure Aetheris with:

- `AETHERIS_FOLDING_ENDPOINT=http://127.0.0.1:8080/predict`
- `AETHERIS_FOLDING_MODEL_ID=esmfold_v1`
- `AETHERIS_FOLDING_PROVIDER=self-hosted-esmfold-v1`
- `AETHERIS_FOLDING_API_KEY`: the same random key as `FOLDING_SERVICE_API_KEY`

Production Aetheris requires HTTPS for the provider endpoint; place the service behind an authenticated private HTTPS reverse proxy or internal service mesh and configure the resulting HTTPS URL. Do not use a public unauthenticated tunnel.

## Endpoints

- `GET /healthz`: process liveness only.
- `GET /readyz`: reports whether model weights have loaded; returns 503 until the model is ready. The Docker image sets `FOLDING_EAGER_LOAD=1` so it loads weights before accepting traffic. For unit tests or local development, set `FOLDING_EAGER_LOAD=0` to use lazy loading.
- `POST /predict`: requires `Authorization: Bearer <FOLDING_SERVICE_API_KEY>`, accepts a raw amino-acid sequence as UTF-8 text, and returns a PDB text response.

The service does not persist submitted sequences or predicted structures. It validates output sequence identity before returning a PDB. A prediction is not experimental evidence, and model confidence is not exposed by this adapter.

## Validation before use

CI tests exercise input validation, authentication, output parsing, sequence matching with a known public 1UBQ fixture, and overload rejection with a mocked model. CI also builds the CUDA image and runs a package-import smoke test. CI does not download model weights or execute actual ESMFold inference. Before relying on the service, build it on the target host, execute a live prediction, verify GPU memory/runtime, and run the project's curated structural benchmark suite.

## License and intended use

Review the ESM/ESMFold and transitive dependency licenses, model-weight terms, privacy obligations, and the intended-use limitations before deployment. Do not use predicted structures for clinical or therapeutic decisions without appropriate independent validation.

## Container compatibility repair (30 October 2026)

Runs 39699697058 and 39700161708 failed importing DeepSpeed 0.5.9 because it
requires `torch._six`, removed from the PyTorch 2.0 image. The candidate now
installs upstream ESMFold extras explicitly with DeepSpeed 0.9.5, constrains
PyTorch/torchvision to the base runtime, and imports the actual ESMFold class
without downloading model weights in the image build. CUDA architecture targets
are explicit so building does not require an attached GPU.

Upstream dependency definition: https://github.com/facebookresearch/esm/blob/main/setup.py
Upstream removal fix: https://github.com/deepspeedai/DeepSpeed/pull/2863

This is a compatibility candidate, not a validated scientific or production
release. The full container build must pass, followed by target-host CUDA checks,
model download/inference, curated reference benchmarks and independent review.
No full GPU inference or production deployment has been performed in this run.
