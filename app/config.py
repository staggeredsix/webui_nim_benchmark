# File: app/config.py
import os
import logging

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

settings = Settings()
