# app/services/vllm.py
import os
import json
import asyncio
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from ..utils.logger import logger
from ..utils.huggingface_key_helper import retrieve_key

class VLLMManager:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self._active_model = None

    async def list_models(self) -> List[Dict[str, Any]]:
        """List all available vLLM models."""
        try:
            # For vLLM we need to list the models that are registered on the server
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/v1/models") as response:
                    if response.status != 200:
                        logger.error(f"Failed to list vLLM models: {response.status}")
                        return []
                    data = await response.json()
                    
                    # Transform to a consistent format with other services
                    models = []
                    for model in data.get('data', []):
                        models.append({
                            "model_id": model.get('id'),
                            "name": model.get('id'),
                            "status": "available",
                            "is_running": True,
                            "backend": "vllm"
                        })
                    return models
        except Exception as e:
            logger.error(f"Error listing vLLM models: {e}")
            return []
    
    async def search_models(self, query: str = "") -> List[Dict[str, Any]]:
        """Search Hugging Face models compatible with vLLM."""
        try:
            # This would ideally query the Hugging Face API to find models
            # For now, we'll return a curated list of popular models compatible with vLLM
            hf_key = retrieve_key()
            headers = {}
            if hf_key:
                headers["Authorization"] = f"Bearer {hf_key}"
                
            async with aiohttp.ClientSession() as session:
                url = "https://huggingface.co/api/models"
                params = {
                    "search": query if query else "llama mistral phi",
                    "filter": "text-generation",
                    "sort": "downloads",
                    "limit": 20
                }
                
                async with session.get(url, params=params, headers=headers) as response:
                    if response.status != 200:
                        logger.error(f"Failed to search Hugging Face models: {response.status}")
                        return []
                        
                    data = await response.json()
                    models = []
                    
                    for model in data:
                        # Skip models that are likely not compatible with vLLM
                        if any(x in model.get("id", "").lower() for x in ["gpt-2", "bert", "t5", "wav", "clip"]):
                            continue
                            
                        models.append({
                            "model_id": model.get("id"),
                            "name": model.get("id"),
                            "description": model.get("description", ""),
                            "downloads": model.get("downloads", 0),
                            "status": "remote",
                            "backend": "vllm"
                        })
                    
                    return models
                    
        except Exception as e:
            logger.error(f"Error searching vLLM models: {e}")
            return []

    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Load a model in vLLM."""
        try:
            # vLLM doesn't have a pull API like Ollama
            # Instead, we'll make a loading request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/v1/models/load",
                    json={"model_id": model_name}
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Failed to load vLLM model: {error_text}")
                        raise Exception(f"Failed to load model: {error_text}")
                    
                    data = await response.json()
                    
                    model_info = {
                        "model_id": model_name,
                        "name": model_name,
                        "status": "available",
                        "backend": "vllm"
                    }
                    
                    return model_info
        except Exception as e:
            logger.error(f"Error loading vLLM model: {e}")
            raise

    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/v1/models/{model_name}") as response:
                    if response.status != 200:
                        return None
                    
                    data = await response.json()
                    return {
                        "model_id": model_name,
                        "name": model_name,
                        "status": "available",
                        "backend": "vllm",
                        "parameters": data.get("model_config", {})
                    }
        except Exception as e:
            logger.error(f"Error getting vLLM model info: {e}")
            return None
    
    async def run_inference(self, model_name: str, prompt: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a single inference request to test model."""
        try:
            if options is None:
                options = {}
                
            payload = {
                "model": model_name,
                "prompt": prompt,
                "max_tokens": options.get("max_tokens", 100),
                "temperature": options.get("temperature", 0.7)
            }
            
            async with aiohttp.ClientSession() as session:
                start_time = datetime.now()
                async with session.post(
                    f"{self.base_url}/v1/completions",
                    json=payload
                ) as response:
                    end_time = datetime.now()
                    
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"vLLM inference request failed: {error_text}")
                        raise Exception(f"Inference request failed: {error_text}")
                    
                    result = await response.json()
                    
                    # Add response time calculation
                    response_time = (end_time - start_time).total_seconds() * 1000  # ms
                    result["response_time"] = response_time
                    
                    return result
        except Exception as e:
            logger.error(f"Error during vLLM inference: {e}")
            raise

    async def get_model_health(self, model_name: str) -> Dict[str, Any]:
        """Check if the model is working correctly by running a simple inference."""
        try:
            result = await self.run_inference(
                model_name=model_name,
                prompt="Hello, are you working correctly?",
                options={"max_tokens": 10}
            )
            
            # Calculate tokens per second (if available)
            tokens_per_second = None
            if "usage" in result and "completion_tokens" in result["usage"]:
                tokens = result["usage"]["completion_tokens"]
                time_ms = result.get("response_time", 0)
                if time_ms > 0:
                    tokens_per_second = (tokens / time_ms) * 1000
            
            return {
                "status": "healthy",
                "response_time": result.get("response_time", 0),
                "tokens_per_second": tokens_per_second
            }
        except Exception as e:
            logger.error(f"vLLM model health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }

# Create singleton instance
vllm_manager = VLLMManager()

# Export the instance
__all__ = ['vllm_manager']
