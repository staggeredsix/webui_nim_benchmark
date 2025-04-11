# app/api/routes.py
from fastapi import APIRouter, Request, HTTPException, WebSocket
from slowapi import Limiter
from slowapi.util import get_remote_address
import asyncio
from app.utils.logger import logger

from .endpoints.benchmark_endpoint import router as benchmark_router
from .endpoints.models import router as models_router 
from .endpoints.logs import router as logs_router
from app.services.benchmark import benchmark_service
from app.services.ollama import ollama_manager
from app.utils.connection import connection_manager
from app.utils.metrics import metrics_collector
from .endpoints.metrics_endpoint import router as metrics_router

limiter = Limiter(key_func=get_remote_address)
api_router = APIRouter()

api_router.include_router(benchmark_router, prefix="/benchmark", tags=["benchmark"])
api_router.include_router(models_router, prefix="/models", tags=["models"])
api_router.include_router(logs_router, prefix="/logs", tags=["logs"])
api_router.include_router(metrics_router, prefix="/metrics", tags=["metrics"])

@api_router.websocket("/metrics")
async def metrics_websocket(websocket: WebSocket):
    await connection_manager.connect(websocket)
    try:
        while True:
            metrics = metrics_collector.collect_metrics()
            await websocket.send_json({
                "type": "metrics_update",
                "metrics": metrics
            })
            await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"Metrics WebSocket error: {e}")
    finally:
        await connection_manager.disconnect(websocket)
    
@api_router.post("/benchmark")
async def benchmark(request: Request):
    """Handles benchmark creation requests."""
    try:
        payload = await request.json()
        if not payload:
            raise HTTPException(status_code=400, detail="Request payload must be in JSON format.")

        name = payload.get('name')
        parameters = payload.get('parameters', {})
        model_id = payload.get('model_id')
        concurrency_level = payload.get('concurrency_level', 1)
        max_tokens = payload.get('max_tokens', 50)
        total_requests = payload.get('total_requests', 100)

        if not model_id:
            raise HTTPException(status_code=400, detail="'model_id' is a required field.")

        # Check if model exists
        model_info = await ollama_manager.get_model_info(model_id)
        if not model_info:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

        result = await benchmark_service.create_benchmark(payload)
        return result

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@api_router.get("/models", tags=["models"])
@limiter.limit("1000/minute")
async def default_models_route(request: Request):
    try:
        models = await ollama_manager.list_models()
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/benchmark/history")
@limiter.limit("1000/minute")
def default_benchmark_history_route(request: Request):
    try:
        return benchmark_service.get_benchmark_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
