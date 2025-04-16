# File: app/config.py
import os
import logging
from pathlib import Path

# Set up basic logging before importing other modules
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

class Settings:
    BASE_PORT = 8000
    MAX_RETRIES = 5
    RETRY_DELAY = 2  # seconds
    
    # Ollama settings
    OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "localhost")
    OLLAMA_PORT = int(os.environ.get("OLLAMA_PORT", "11434"))
    OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", f"http://{OLLAMA_HOST}:{OLLAMA_PORT}")
    
    # vLLM settings
    VLLM_HOST = os.environ.get("VLLM_HOST", "localhost")
    VLLM_PORT = int(os.environ.get("VLLM_PORT", "8000"))
    VLLM_BASE_URL = os.environ.get("VLLM_BASE_URL", f"http://{VLLM_HOST}:{VLLM_PORT}")
    
    # NIM settings
    NIM_HOST = os.environ.get("NIM_HOST", "localhost")
    NIM_PORT = int(os.environ.get("NIM_PORT", "8000"))
    NIM_FILE = os.environ.get("NIM_FILE", ".active_nim")  # File to store active NIM container info
    
    # API Keys
    NGC_API_KEY = None  # Will be populated from file
    HF_API_KEY = None   # Will be populated from file
    
    # Data directories
    DATA_DIR = Path("data")
    
    def __init__(self):
        # Create data directory if it doesn't exist
        self.DATA_DIR.mkdir(exist_ok=True)
        
        # Initialize API keys from files if they exist
        try:
            from .utils.ngc_key_helper import retrieve_key as get_ngc_key
            self.NGC_API_KEY = get_ngc_key()
        except Exception:
            pass
            
        try:
            from .utils.huggingface_key_helper import retrieve_key as get_hf_key
            self.HF_API_KEY = get_hf_key()
        except Exception:
            pass

settings = Settings()
