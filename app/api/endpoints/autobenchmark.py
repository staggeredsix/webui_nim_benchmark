# app/api/endpoints/autobenchmark.py - Fixed version
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from ...services.autobenchmark import auto_benchmark_service
from ...utils.logger import logger

router = APIRouter()

class AutoBenchmarkRequest(BaseModel):
    model_id: str = Field(..., description="ID of the model to benchmark")
    prompt: str = Field(..., description="Base prompt to use for benchmarking")
    description: Optional[str] = Field(None, description="Optional description of this auto-benchmark run")

@router.post("/start")
async def start_auto_benchmark(request: AutoBenchmarkRequest, background_tasks: BackgroundTasks):
    """Start an auto-benchmark run that tests multiple configurations."""
    try:
        if auto_benchmark_service.is_running:
            raise HTTPException(status_code=400, detail="An auto-benchmark is already running")
        
        logger.info(f"Starting auto-benchmark for model {request.model_id} with prompt: {request.prompt}")
        
        # Start the auto-benchmark in a background task
        background_tasks.add_task(
            auto_benchmark_service.run_auto_benchmark,
            model_id=request.model_id,
            base_prompt=request.prompt
        )
        
        return {
            "status": "started",
            "model_id": request.model_id,
            "message": "Auto-benchmark started in the background"
        }
    except Exception as e:
        logger.error(f"Error starting auto-benchmark: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_auto_benchmark():
    """Stop the currently running auto-benchmark."""
    try:
        result = auto_benchmark_service.stop_running_benchmark()
        return result
    except Exception as e:
        logger.error(f"Error stopping auto-benchmark: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_auto_benchmark_status():
    """Get the current status and partial results of the running auto-benchmark."""
    try:
        status = auto_benchmark_service.get_status()
        # Ensure the status response has the proper structure
        if not status:
            return {
                "is_running": False,
                "current_results": {
                    "model_id": "",
                    "timestamp": datetime.now().isoformat(),
                    "tests": [],
                    "optimal_config": None,
                    "status": "error"
                }
            }
        return status
    except Exception as e:
        logger.error(f"Error getting auto-benchmark status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_auto_benchmark_history():
    """Get the history of auto-benchmark runs."""
    try:
        history = auto_benchmark_service.get_history()
        # Always return a list, even if empty
        if history is None:
            return []
        return history
    except Exception as e:
        logger.error(f"Error getting auto-benchmark history: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
