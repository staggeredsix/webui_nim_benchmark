# File: app/api/endpoints/models.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.services.ollama import ollama_manager
from app.utils.logger import logger

router = APIRouter()

class ModelPullRequest(BaseModel):
    name: str

class ModelSearchRequest(BaseModel):
    query: Optional[str] = ""

@router.get("/", tags=["models"])
async def list_models():
    """List all available Ollama models."""
    try:
        models = await ollama_manager.list_models()
        return models
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", tags=["models"])
async def search_models(request: ModelSearchRequest):
    """Search available models in Ollama library."""
    try:
        models = await ollama_manager.search_models(request.query)
        return models
    except Exception as e:
        logger.error(f"Failed to search models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pull", tags=["models"])
async def pull_model(request: ModelPullRequest, background_tasks: BackgroundTasks):
    """Pull a model from Ollama library."""
    try:
        # Start pull process in background
        background_tasks.add_task(ollama_manager.pull_model, request.name)
        return {"status": "downloading", "model": request.name}
    except Exception as e:
        logger.error(f"Failed to pull model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{model_name}", tags=["models"])
async def delete_model(model_name: str):
    """Delete a model from Ollama."""
    try:
        success = await ollama_manager.delete_model(model_name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found or could not be deleted")
        return {"status": "deleted", "model": model_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_name}/health", tags=["models"])
async def check_model_health(model_name: str):
    """Check if model is working correctly."""
    try:
        health = await ollama_manager.get_model_health(model_name)
        return health
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_name}", tags=["models"])
async def get_model_info(model_name: str):
    """Get detailed information about a model."""
    try:
        model = await ollama_manager.get_model_info(model_name)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        return model
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))
