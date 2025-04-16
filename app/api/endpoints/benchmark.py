# File: app/api/endpoints/benchmark.py
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime
import json
from typing import Dict, Any
from ...models.database import get_db
from ...models.benchmark import BenchmarkRun
from ...services.container import ContainerManager
from ...utils.logger import logger

router = APIRouter()
container_manager = ContainerManager()

@router.post("/benchmark")
async def create_benchmark(config: Dict[str, Any], db: Session = Depends(get_db)):
   try:
       nim_id = config.pop('nim_id', None)
       if not nim_id:
           raise HTTPException(status_code=400, detail="NIM ID is required")
           
       nim = next((n for n in container_manager.list_containers() if n['container_id'] == nim_id), None)
       if not nim:
           raise HTTPException(status_code=404, detail="Selected NIM not found")

       benchmark_config = BenchmarkConfig(
           total_requests=config.get('totalRequests', 100),
           concurrency_level=config.get('concurrencyLevel', 10),
           max_tokens=config.get('maxTokens', 100),
           prompt=config.get('prompt', '')
       )

       run = BenchmarkRun(
           model_name=config.get('prompt', ''),
           config=json.dumps(config),
           status="running"
       )
       db.add(run)
       db.commit()
       db.refresh(run)

       executor = BenchmarkExecutor(nim['url'], nim['image_name'], benchmark_config)
       asyncio.create_task(executor.run_benchmark())
       
       return {"run_id": run.id}
   except Exception as e:
       logger.error(f"Failed to start benchmark: {e}")
       raise HTTPException(status_code=500, detail=str(e))

@router.get("/benchmark/history")
def get_benchmark_history(db: Session = Depends(get_db)):
    try:
        runs = db.query(BenchmarkRun).order_by(BenchmarkRun.start_time.desc()).all()
        return [format_benchmark_run(run) for run in runs]
    except Exception as e:
        logger.error(f"Failed to get benchmark history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def format_benchmark_run(run: BenchmarkRun):
    return {
        "id": run.id,
        "model_name": run.model_name,
        "status": run.status,
        "start_time": run.start_time.isoformat(),
        "end_time": run.end_time.isoformat() if run.end_time else None,
        "metrics": {
            "average_tps": run.average_tps,
            "peak_tps": run.peak_tps,
            "p95_latency": run.p95_latency
        }
    }
