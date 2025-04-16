# File: app/api/endpoints/vllm.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.services.vllm import vllm_manager
from app.utils.logger import logger
from app.utils.huggingface_key_helper import key_exists

router = APIRouter()

class ModelPullRequest(BaseModel):
    name: str

class ModelSearchRequest(BaseModel):
    query: Optional[str] = ""

@router.get("/", tags=["vllm"])
async def list_vllm_models():
    """List all available vLLM models."""
    try:
        models = await vllm_manager.list_models()
        return models
    except Exception as e:
        logger.error(f"Failed to list vLLM models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", tags=["vllm"])
async def search_vllm_models(request: ModelSearchRequest):
    """Search available models in Hugging Face that are compatible with vLLM."""
    try:
        models = await vllm_manager.search_models(request.query)
        return models
    except Exception as e:
        logger.error(f"Failed to search vLLM models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pull", tags=["vllm"])
async def pull_vllm_model(request: ModelPullRequest, background_tasks: BackgroundTasks):
    """Load a model into vLLM."""
    try:
        if not key_exists():
            # vLLM can work without an API key for some models, so just a warning
            logger.warning("Hugging Face API key not set")
        
        # Start loading process in background
        background_tasks.add_task(vllm_manager.pull_model, request.name)
        return {"status": "loading", "model": request.name}
    except Exception as e:
        logger.error(f"Failed to load vLLM model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_name}/health", tags=["vllm"])
async def check_vllm_model_health(model_name: str):
    """Check if model is working correctly."""
    try:
        health = await vllm_manager.get_model_health(model_name)
        return health
    except Exception as e:
        logger.error(f"vLLM health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_name}", tags=["vllm"])
async def get_vllm_model_info(model_name: str):
    """Get detailed information about a model."""
    try:
        model = await vllm_manager.get_model_info(model_name)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        return model
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get vLLM model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))
