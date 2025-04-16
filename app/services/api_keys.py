# app/services/api_keys.py
import os
import json
from pathlib import Path
from typing import Dict, Optional
from ..utils.logger import logger
from ..config import settings

class APIKeyManager:
    """
    A centralized service for managing API keys used by different backends.
    This handles both NGC and Hugging Face API keys in a consistent manner.
    """
    
    def __init__(self, data_dir: Path = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.data_dir.mkdir(exist_ok=True)
        
        self.key_files = {
            'ngc': self.data_dir / ".ngc_api_key",
            'huggingface': self.data_dir / ".huggingface_api_key"
        }
        
        # Initialize environment variables if keys exist
        self._load_keys_to_env()
    
    def _load_keys_to_env(self):
        """Load existing API keys into environment variables at startup."""
        for key_type, key_file in self.key_files.items():
            if key_file.exists():
                try:
                    with open(key_file, "r") as f:
                        key = f.read().strip()
                        if key:
                            if key_type == 'ngc':
                                os.environ["NGC_API_KEY"] = key
                                settings.NGC_API_KEY = key
                            elif key_type == 'huggingface':
                                os.environ["HUGGINGFACE_API_KEY"] = key
                                settings.HF_API_KEY = key
                except Exception as e:
                    logger.error(f"Error loading {key_type} API key: {e}")
    
    def save_key(self, key_type: str, key: str) -> bool:
        """Save an API key to file and set environment variable."""
        if key_type not in self.key_files:
            logger.error(f"Unknown API key type: {key_type}")
            return False
            
        try:
            key_file = self.key_files[key_type]
            with open(key_file, "w") as f:
                f.write(key)
                
            # Also set in environment and settings
            if key_type == 'ngc':
                os.environ["NGC_API_KEY"] = key
                settings.NGC_API_KEY = key
            elif key_type == 'huggingface':
                os.environ["HUGGINGFACE_API_KEY"] = key
                settings.HF_API_KEY = key
                
            logger.info(f"{key_type.upper()} API key saved successfully")
            return True
        except Exception as e:
            logger.error(f"Error saving {key_type} API key: {e}")
            return False
    
    def retrieve_key(self, key_type: str) -> Optional[str]:
        """Retrieve an API key from file."""
        if key_type not in self.key_files:
            logger.error(f"Unknown API key type: {key_type}")
            return None
            
        try:
            key_file = self.key_files[key_type]
            if not key_file.exists():
                logger.warning(f"{key_type.upper()} API key file not found")
                return None
                
            with open(key_file, "r") as f:
                key = f.read().strip()
                return key if key else None
        except Exception as e:
            logger.error(f"Error retrieving {key_type} API key: {e}")
            return None
    
    def delete_key(self, key_type: str) -> bool:
        """Delete an API key file and remove from environment."""
        if key_type not in self.key_files:
            logger.error(f"Unknown API key type: {key_type}")
            return False
            
        try:
            key_file = self.key_files[key_type]
            if key_file.exists():
                key_file.unlink()
                
            # Also remove from environment and settings
            if key_type == 'ngc':
                if "NGC_API_KEY" in os.environ:
                    del os.environ["NGC_API_KEY"]
                settings.NGC_API_KEY = None
            elif key_type == 'huggingface':
                if "HUGGINGFACE_API_KEY" in os.environ:
                    del os.environ["HUGGINGFACE_API_KEY"]
                settings.HF_API_KEY = None
                
            logger.info(f"{key_type.upper()} API key deleted successfully")
            return True
        except Exception as e:
            logger.error(f"Error deleting {key_type} API key: {e}")
            return False
    
    def key_exists(self, key_type: str) -> bool:
        """Check if an API key exists."""
        if key_type not in self.key_files:
            return False
            
        key_file = self.key_files[key_type]
        return key_file.exists()
    
    def get_key_status(self) -> Dict[str, bool]:
        """Get the status of all API keys."""
        return {
            'ngc': self.key_exists('ngc'),
            'huggingface': self.key_exists('huggingface')
        }

# Create singleton instance
api_key_manager = APIKeyManager()

# Export the instance
__all__ = ['api_key_manager']
