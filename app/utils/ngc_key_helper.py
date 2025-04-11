# app/utils/ngc_key_helper.py
import os
from ..utils.logger import logger

NGC_API_KEY_FILE = ".ngc_api_key"

def save_key(key: str):
    with open(NGC_API_KEY_FILE, "w") as f:
        f.write(key)
    os.environ["NGC_API_KEY"] = key
    logger.info("NGC API key saved and environment variable set")

def retrieve_key() -> str | None:
    try:
        if not os.path.exists(NGC_API_KEY_FILE):
            logger.warning("NGC API key file not found")
            return None
            
        with open(NGC_API_KEY_FILE, "r") as f:
            key = f.read().strip()
            os.environ["NGC_API_KEY"] = key
            logger.info("NGC API key loaded and environment variable set")
            return key
    except Exception as e:
        logger.error(f"Error retrieving NGC key: {e}")
        return None

def delete_key():
    if os.path.exists(NGC_API_KEY_FILE):
        os.remove(NGC_API_KEY_FILE)
        if "NGC_API_KEY" in os.environ:
            del os.environ["NGC_API_KEY"]
        logger.info("NGC API key deleted and environment variable unset")

def key_exists() -> bool:
    return os.path.exists(NGC_API_KEY_FILE)