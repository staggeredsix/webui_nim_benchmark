# app/utils/huggingface_key_helper.py
import os
from ..utils.logger import logger

HF_API_KEY_FILE = ".huggingface_api_key"

def save_key(key: str):
    """Save the Hugging Face API key to a file."""
    with open(HF_API_KEY_FILE, "w") as f:
        f.write(key)
    os.environ["HUGGINGFACE_API_KEY"] = key
    logger.info("Hugging Face API key saved and environment variable set")

def retrieve_key() -> str | None:
    """Retrieve the Hugging Face API key from file."""
    try:
        if not os.path.exists(HF_API_KEY_FILE):
            logger.warning("Hugging Face API key file not found")
            return None
            
        with open(HF_API_KEY_FILE, "r") as f:
            key = f.read().strip()
            os.environ["HUGGINGFACE_API_KEY"] = key
            logger.info("Hugging Face API key loaded and environment variable set")
            return key
    except Exception as e:
        logger.error(f"Error retrieving Hugging Face key: {e}")
        return None

def delete_key():
    """Delete the Hugging Face API key."""
    if os.path.exists(HF_API_KEY_FILE):
        os.remove(HF_API_KEY_FILE)
        if "HUGGINGFACE_API_KEY" in os.environ:
            del os.environ["HUGGINGFACE_API_KEY"]
        logger.info("Hugging Face API key deleted and environment variable unset")

def key_exists() -> bool:
    """Check if a Hugging Face API key exists."""
    return os.path.exists(HF_API_KEY_FILE)
