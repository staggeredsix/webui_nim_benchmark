# app/api/endpoints/benchmark_endpoint.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict

# Correct import path
from app.services.benchmark import benchmark_service

router = APIRouter()

class BenchmarkConfig(BaseModel):
    total_requests: int = Field(..., gt=0, description="Total number of requests to send")
    concurrency_level: int = Field(..., gt=0, description="Number of concurrent requests")
    max_tokens: Optional[int] = Field(None, gt=0, description="Maximum number of tokens per request")
    prompt: str = Field(..., min_length=1, description="Prompt template for the benchmark")
    name: str = Field(..., min_length=1, description="Name of the benchmark")
    description: Optional[str] = Field(None, description="Optional description of the benchmark")
    nim_id: str = Field(..., min_length=1, description="ID of the NIM container to use")
@router.post("/")
async def create_benchmark(config: BenchmarkConfig):
    try:
        run = await benchmark_service.create_benchmark(config.model_dump())
        return {"run_id": run.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_benchmark_history():
    return [run for run in benchmark_service.get_benchmark_history()]

@router.get("/{run_id}")
def get_benchmark(run_id: int):
    run = benchmark_service.get_benchmark(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
    return run.to_dict()