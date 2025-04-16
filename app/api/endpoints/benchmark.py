# app/api/endpoints/benchmark_endpoint.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum

# Correct import path
from app.services.benchmark import benchmark_service

router = APIRouter()

class BackendType(str, Enum):
    OLLAMA = "ollama"
    VLLM = "vllm"
    NIM = "nim"

class BenchmarkConfig(BaseModel):
    total_requests: int = Field(..., gt=0, description="Total number of requests to send")
    concurrency_level: int = Field(..., gt=0, description="Number of concurrent requests")
    max_tokens: Optional[int] = Field(None, gt=0, description="Maximum number of tokens per request")
    prompt: str = Field(..., min_length=1, description="Prompt template for the benchmark")
    name: str = Field(..., min_length=1, description="Name of the benchmark")
    description: Optional[str] = Field(None, description="Optional description of the benchmark")
    backend: BackendType = Field(BackendType.OLLAMA, description="Backend to use for the benchmark")
    
    # Backend-specific fields
    model_id: Optional[str] = Field(None, description="ID of the model for Ollama or vLLM backends")
    nim_id: Optional[str] = Field(None, description="ID of the NIM container to use")
    
    # Advanced settings
    stream: Optional[bool] = Field(False, description="Whether to use streaming mode")
    batch_size: Optional[int] = Field(1, gt=0, description="Batch size for non-streaming requests")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=1.0, description="Temperature for generation")
    top_p: Optional[float] = Field(0.9, ge=0.0, le=1.0, description="Top-p sampling parameter")
    top_k: Optional[int] = Field(40, ge=0, description="Top-k sampling parameter")
    context_size: Optional[str] = Field("auto", description="Context window size (auto or number)")
    gpu_count: Optional[int] = Field(1, ge=1, description="Number of GPUs to use (NIM only)")
    
    class Config:
        use_enum_values = True

@router.post("/")
async def create_benchmark(config: BenchmarkConfig):
    try:
        # Validate backend-specific parameters
        if config.backend == BackendType.OLLAMA and not config.model_id:
            raise HTTPException(status_code=400, detail="'model_id' is required for Ollama benchmarks")
        elif config.backend == BackendType.VLLM and not config.model_id:
            raise HTTPException(status_code=400, detail="'model_id' is required for vLLM benchmarks")
        elif config.backend == BackendType.NIM and not config.nim_id:
            raise HTTPException(status_code=400, detail="'nim_id' is required for NIM benchmarks")
            
        run = await benchmark_service.create_benchmark(config.dict())
        return {"run_id": run["id"], "name": run["name"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_benchmark_history():
    return benchmark_service.get_benchmark_history()

@router.get("/history/{backend}")
def get_backend_benchmark_history(backend: BackendType):
    try:
        all_history = benchmark_service.get_benchmark_history()
        filtered_history = [run for run in all_history if run.get("backend", "ollama") == backend]
        return filtered_history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{run_id}")
def get_benchmark(run_id: int):
    run = benchmark_service.get_benchmark(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
    return run
