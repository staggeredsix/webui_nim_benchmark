# File: app/services/benchmark_progress.py
from dataclasses import dataclass
from datetime import datetime
import asyncio
from typing import Dict

@dataclass
class BenchmarkProgress:
    run_id: int
    completed: int
    total: int
    current_tps: float
    start_time: datetime
    
    @property
    def estimated_time_remaining(self) -> float:
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
        if self.completed == 0:
            return 0
        return (elapsed / self.completed) * (self.total - self.completed)

class ProgressTracker:
    def __init__(self):
        self.progress: Dict[int, BenchmarkProgress] = {}
    
    async def update_progress(self, run_id: int, completed: int, current_tps: float):
        if run_id not in self.progress:
            self.progress[run_id] = BenchmarkProgress(
                run_id=run_id,
                completed=completed,
                total=100,  # Get from config
                current_tps=current_tps,
                start_time=datetime.utcnow()
            )
        else:
            self.progress[run_id].completed = completed
            self.progress[run_id].current_tps = current_tps

progress_tracker = ProgressTracker()
