"""Import the production inference path without loading weights or requiring a GPU."""
import faulthandler
import importlib
import time

faulthandler.enable()
faulthandler.dump_traceback_later(60, repeat=True)
try:
    for name in ("torch", "esm", "deepspeed", "pytorch_lightning", "openfold", "esm.esmfold.v1.esmfold", "fastapi", "uvicorn", "app"):
        start = time.monotonic()
        print(f"IMPORT_START {name}", flush=True)
        module = importlib.import_module(name)
        print(f"IMPORT_OK {name} elapsed_s={time.monotonic()-start:.3f}", flush=True)
    service = importlib.import_module("app")
    assert service.MODEL is None, "Import smoke test unexpectedly loaded model weights"
    torch = importlib.import_module("torch")
    assert torch.__version__.split("+")[0] == "2.0.0", "Unverified PyTorch runtime"
    print(f"SMOKE_OK torch={torch.__version__} cuda_build={torch.version.cuda} weights_loaded=False", flush=True)
finally:
    faulthandler.cancel_dump_traceback_later()
