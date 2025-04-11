# app/services/ollama.py
import os
import json
import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, List, Optional, Any
from ..utils.logger import logger

class OllamaManager:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip('/')
        self._active_model = None

    async def list_models(self) -> List[Dict[str, Any]]:
        """List all available Ollama models."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    if response.status != 200:
                        logger.error(f"Failed to list models: {response.status}")
                        return []
                    data = await response.json()
                    
                    # Transform to a format similar to what we had with NIM
                    models = []
                    for model in data.get('models', []):
                        models.append({
                            "model_id": model.get('name'),
                            "name": model.get('name'),
                            "size": model.get('size', 0),
                            "modified_at": model.get('modified_at', ''),
                            "status": "available",
                            "is_running": False,
                            "parameters": model.get('parameters', {})
                        })
                    return models
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    async def search_models(self, query: str = "") -> List[Dict[str, Any]]:
        """Search available models from Ollama library."""
        try:
            # Ollama doesn't have a dedicated search API, using a hardcoded endpoint that's 
            # commonly used by Ollama web UIs
            search_url = "https://ollama.ai/library/search"
            if query:
                search_url += f"?q={query}"
                
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url) as response:
                    if response.status != 200:
                        logger.error(f"Failed to search models: {response.status}")
                        return []
                    
                    data = await response.json()
                    models = []
                    
                    # Transform to our standard format
                    for model in data.get('models', []):
                        models.append({
                            "model_id": model.get('name'),
                            "name": model.get('name'),
                            "description": model.get('description', ''),
                            "tags": model.get('tags', []),
                            "size": model.get('size', 0),
                            "downloads": model.get('downloads', 0),
                            "status": "remote"
                        })
                    return models
        except Exception as e:
            logger.error(f"Error searching models: {e}")
            return []

    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Pull a model from Ollama library."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/pull",
                    json={"name": model_name},
                    timeout=None  # Models can be large
                ) as response:
                    # Note: Ollama streams the download progress, but we'll just wait for completion
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Failed to pull model: {error_text}")
                        raise Exception(f"Failed to pull model: {error_text}")
                    
                    # Read the streaming response until complete
                    download_info = {}
                    async for line in response.content:
                        try:
                            info = json.loads(line)
                            download_info = info
                            # Log progress updates
                            if 'completed' in info and 'total' in info:
                                progress = (info['completed'] / info['total']) * 100 if info['total'] > 0 else 0
                                logger.info(f"Pulling {model_name}: {progress:.1f}% complete")
                        except json.JSONDecodeError:
                            pass
                    
                    # After download is complete, get the model details
                    model_info = {
                        "model_id": model_name,
                        "name": model_name,
                        "status": "available",
                        "download_info": download_info
                    }
                    
                    return model_info
        except Exception as e:
            logger.error(f"Error pulling model: {e}")
            raise

    async def delete_model(self, model_name: str) -> bool:
        """Delete a model from Ollama."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(
                    f"{self.base_url}/api/delete",
                    json={"name": model_name}
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Failed to delete model: {error_text}")
                        return False
                    return True
        except Exception as e:
            logger.error(f"Error deleting model: {e}")
            return False

    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model."""
        try:
            models = await self.list_models()
            for model in models:
                if model["name"] == model_name:
                    return model
            return None
        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return None
    
    async def run_inference(self, model_name: str, prompt: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a single inference request to test model."""
        try:
            if options is None:
                options = {}
                
            payload = {
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                **options
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Inference request failed: {error_text}")
                        raise Exception(f"Inference request failed: {error_text}")
                    
                    result = await response.json()
                    return result
        except Exception as e:
            logger.error(f"Error during inference: {e}")
            raise

    async def get_model_health(self, model_name: str) -> Dict[str, Any]:
        """Check if the model is working correctly by running a simple inference."""
        try:
            result = await self.run_inference(
                model_name=model_name,
                prompt="Hello, are you working correctly?",
                options={"max_tokens": 10}
            )
            
            return {
                "status": "healthy" if result.get("response") else "unhealthy",
                "response_time": result.get("total_duration", 0),
                "tokens_per_second": result.get("eval_count", 0) / (result.get("eval_duration", 1) / 1000000000)
            }
        except Exception as e:
            logger.error(f"Model health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }

# Create singleton instance
ollama_manager = OllamaManager()

# Export the instance
__all__ = ['ollama_manager']
