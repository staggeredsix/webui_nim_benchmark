# File: app/models/benchmark_telemetry.py
from datetime import datetime
from typing import Dict, Any, Optional

class BenchmarkRun:
    def __init__(
        self,
        id: int,
        name: str,
        description: Optional[str],
        model_name: str,
        nim_id: str,
        config: Dict[str, Any],
        status: str = "pending",
        start_time: Optional[datetime] = None,
    ):
        self.id = id
        self.name = name
        self.description = description
        self.model_name = model_name
        self.nim_id = nim_id
        self.config = config
        self.status = status
        self.start_time = start_time or datetime.now()
        self.end_time = None
        
        # Performance metrics
        self.total_tokens = 0
        self.tokens_per_second = 0.0
        self.latency = 0.0
        self.gpu_utilization = 0.0
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "model_name": self.model_name,
            "nim_id": self.nim_id,
            "config": self.config,
            "status": self.status,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "metrics": {
                "total_tokens": self.total_tokens,
                "tokens_per_second": self.tokens_per_second,
                "latency": self.latency,
                "gpu_utilization": self.gpu_utilization,
            }
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'BenchmarkRun':
        run = BenchmarkRun(
            id=data["id"],
            name=data["name"],
            description=data.get("description"),
            model_name=data["model_name"],
            nim_id=data["nim_id"],
            config=data["config"],
            status=data["status"],
            start_time=datetime.fromisoformat(data["start_time"])
        )
        
        if data.get("end_time"):
            run.end_time = datetime.fromisoformat(data["end_time"])
            
        metrics = data.get("metrics", {})
        for key, value in metrics.items():
            setattr(run, key, value)
            
        return run