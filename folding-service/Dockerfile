# ESMFold v1/OpenFold require a CUDA development toolchain at install time.
# Candidate PyTorch 2.0/Python 3.10 stack. This differs from upstream ESMFold's
# legacy environment; imports and live GPU inference are separate release gates.
FROM pytorch/pytorch:2.0.0-cuda11.7-cudnn8-devel

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_CONSTRAINT=/app/constraints.txt \
    FOLDING_DEVICE=cuda \
    FOLDING_EAGER_LOAD=1 \
    FOLDING_CHUNK_SIZE=64 \
    TORCH_CUDA_ARCH_LIST="7.0;7.5;8.0;8.6" \
    TORCH_HOME=/models/torch

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git build-essential && rm -rf /var/lib/apt/lists/*

# Prevent transitive dependency upgrades from moving the legacy OpenFold stack
# to NumPy 2.x, which is not assumed compatible.
RUN printf 'numpy==1.23.5\ntorch==2.0.0\ntorchvision==0.15.1\n' > /app/constraints.txt

COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade 'pip==24.3.1' && \
    python -m pip install -c /app/constraints.txt -r requirements.txt && \
    python -m pip check

COPY app.py smoke_import.py ./

# Import the actual service under the same pinned runtime used in production.
# This is a packaging smoke test only; it deliberately does not download model weights.
RUN timeout 300 python -u smoke_import.py

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
