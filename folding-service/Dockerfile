# GPU-oriented image for the optional self-hosted ESMFold v1 service.
# Build/runtime compatibility must be verified on the target CUDA driver/GPU.
FROM pytorch/pytorch:1.12.1-cuda11.3-cudnn8-devel

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FOLDING_DEVICE=cuda \
    FOLDING_CHUNK_SIZE=64 \
    TORCH_HOME=/models/torch

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip && python -m pip install -r requirements.txt

COPY app.py ./app.py

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
