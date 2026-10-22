# ESMFold v1/OpenFold require a CUDA development toolchain at install time.
# Python 3.8 is supported by the pinned FastAPI version and is within ESMFold's
# documented Python <= 3.9 compatibility range.
FROM pytorch/pytorch:2.0.0-cuda11.7-cudnn8-devel

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_CONSTRAINT=/app/constraints.txt \
    FOLDING_DEVICE=cuda \
    FOLDING_EAGER_LOAD=1 \
    FOLDING_CHUNK_SIZE=64 \
    TORCH_HOME=/models/torch

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git build-essential && rm -rf /var/lib/apt/lists/*

# Prevent transitive dependency upgrades from moving the legacy OpenFold stack
# to NumPy 2.x, which is not assumed compatible.
RUN printf 'numpy==1.23.5\n' > /app/constraints.txt

COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade 'pip==24.3.1' && \
    python -m pip install -c /app/constraints.txt -r requirements.txt && \
    python -c "import torch, esm, openfold; print('torch=', torch.__version__, 'cuda=', torch.version.cuda, 'esm=', esm.__file__, 'openfold=', openfold.__file__)"

COPY app.py ./app.py

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
