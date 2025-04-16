# app/api/routes.py (Updated version)
from fastapi import APIRouter, Request, HTTPException, WebSocket
from slowapi import Limiter
from slowapi.util import get_remote_address
import asyncio
from app.utils.logger import logger

from .endpoints.benchmark_endpoint import router as benchmark_router
from .endpoints.models import router as models_router 
from .endpoints.logs import router as logs_router
from .endpoints.ngc import router as ngc_router
from .endpoints.huggingface import router as huggingface_router  # New Hugging Face endpoint
from .endpoints.nim import router as nim_router
from .endpoints.vllm import router as vllm_router  # New vLLM endpoint
from .endpoints.autobenchmark import router as autobenchmark_router
from app.services.benchmark import benchmark_service
from app.services.ollama import ollama_manager
from app.services.vllm import vllm_manager  # New vLLM service
from app.utils.connection import connection_manager
from app.utils.metrics import metrics_collector
from .endpoints.metrics_endpoint import router as metrics_router

limiter = Limiter(key_func=get_remote_address)
api_router = APIRouter()

# Include all routers
api_router.include_router(benchmark_router, prefix="/benchmark", tags=["benchmark"])
api_router.include_router(models_router, prefix="/models", tags=["models"])
api_router.include_router(logs_router, prefix="/logs", tags=["logs"])
api_router.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
api_router.include_router(ngc_router, prefix="/ngc-key", tags=["ngc"])
api_router.include_router(huggingface_router, prefix="/hf-key", tags=["huggingface"])  # New Hugging Face endpoint
api_router.include_router(nim_router, prefix="/nim", tags=["nim"])
api_router.include_router(vllm_router, prefix="/vllm", tags=["vllm"])  # New vLLM endpoint
api_router.include_router(autobenchmark_router, prefix="/autobenchmark", tags=["autobenchmark"])

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
        backend = payload.get('backend', 'ollama')  # New field to specify the backend
        concurrency_level = payload.get('concurrency_level', 1)
        max_tokens = payload.get('max_tokens', 50)
        total_requests = payload.get('total_requests', 100)

        if not model_id and not payload.get('nim_id'):
            raise HTTPException(status_code=400, detail="Either 'model_id' or 'nim_id' is required.")

        # Check if model exists based on the backend
        if model_id:
            if backend == 'ollama':
                model_info = await ollama_manager.get_model_info(model_id)
                if not model_info:
                    raise HTTPException(status_code=404, detail=f"Ollama model {model_id} not found")
            elif backend == 'vllm':
                model_info = await vllm_manager.get_model_info(model_id)
                if not model_info:
                    raise HTTPException(status_code=404, detail=f"vLLM model {model_id} not found")
            elif backend == 'nim':
                # NIM benchmarks are handled differently via nim_id
                pass
            else:
                raise HTTPException(status_code=400, detail=f"Unknown backend: {backend}")

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
        # Get models from all backends
        ollama_models = await ollama_manager.list_models()
        vllm_models = await vllm_manager.list_models()
        
        # Combine models from different backends
        all_models = []
        for model in ollama_models:
            model["backend"] = "ollama"
            all_models.append(model)
            
        for model in vllm_models:
            if "backend" not in model:
                model["backend"] = "vllm"
            all_models.append(model)
            
        return all_models
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/benchmark/history")
@limiter.limit("1000/minute")
def default_benchmark_history_route(request: Request):
    try:
        return benchmark_service.get_benchmark_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
