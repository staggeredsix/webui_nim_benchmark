from fastapi import APIRouter
from ...utils.metrics import metrics_collector
from typing import Dict, Any
router = APIRouter()

@router.get("")
async def get_metrics() -> Dict[str, Any]:
    metrics = metrics_collector.collect_metrics()
    # Convert all values to JSON-serializable types
    if 'gpu_metrics' in metrics:
        metrics['gpu_metrics'] = [{
            'gpu_utilization': float(gpu.get('gpu_utilization', 0)),
            'gpu_memory_used': float(gpu.get('gpu_memory_used', 0)),
            'gpu_memory_total': float(gpu.get('gpu_memory_total', 0)),
            'gpu_temp': float(gpu.get('gpu_temp', 0)),
            'power_draw': float(gpu.get('power_draw', 0)),
            'name': gpu.get('name', 'Unknown')
        } for gpu in metrics['gpu_metrics']]
    
    return {
        'timestamp': metrics.get('timestamp', ''),
        'gpu_metrics': metrics.get('gpu_metrics', []),
        'tokens_per_second': float(metrics.get('tokens_per_second', 0)),
        'peak_tps': float(metrics.get('peak_tps', 0)),
        'avg_gpu_utilization': float(metrics.get('avg_gpu_utilization', 0)),
        'power_draw': float(metrics.get('power_draw', 0))
    }