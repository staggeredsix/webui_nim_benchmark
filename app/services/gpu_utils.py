# app/services/gpu_utils.py
import subprocess

def count_nvidia_gpus() -> int:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=count", "--format=csv,noheader"],
            capture_output=True,
            text=True,
        )
        return int(result.stdout.strip())
    except Exception as e:
        print(f"Error counting NVIDIA GPUs: {e}")
        return 0  # Fallback to 0 GPUs if there's an error