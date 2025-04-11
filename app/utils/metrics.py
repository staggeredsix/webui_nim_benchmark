# app/utils/metrics.py
import psutil
import subprocess
from typing import Dict, List
from datetime import datetime
import time
from ..utils.logger import logger

class MetricsCollector:
    def __init__(self):
        self.peak_tps = 0.0
        self.peak_gpu_util = 0.0
        self.peak_gpu_mem = 0.0
        self.tokens_count = 0
        self.tokens_last_window = 0
        self.last_update = time.time()
        self.historical_metrics: List[Dict] = []

    def get_gpu_metrics(self, gpu_index: int) -> Dict:
        try:
            result = subprocess.run([
                'nvidia-smi',
                f'--id={gpu_index}',
                '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,clocks.sm,name',
                '--format=csv,nounits,noheader'
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                values = [v.strip() for v in result.stdout.strip().split(',')]
                metrics = {
                    'gpu_utilization': float(values[0]),
                    'gpu_memory_used': float(values[1]),
                    'gpu_memory_total': float(values[2]),
                    'gpu_temp': float(values[3]),
                    'power_draw': float(values[4]),
                    'sm_clock': float(values[5]),
                    'name': values[6]
                }
                self.peak_gpu_util = max(self.peak_gpu_util, metrics['gpu_utilization'])
                self.peak_gpu_mem = max(self.peak_gpu_mem, metrics['gpu_memory_used'])
                return metrics
        except Exception as e:
            logger.error(f"GPU {gpu_index} metrics error: {e}")
        return {}

    def calculate_tps(self) -> float:
        current_time = time.time()
        window_size = current_time - self.last_update
        if window_size > 0:
            tps = (self.tokens_count - self.tokens_last_window) / window_size
            self.tokens_last_window = self.tokens_count
            self.last_update = current_time
            self.peak_tps = max(self.peak_tps, tps)
            return tps
        return 0.0

    def collect_metrics(self) -> Dict:
        try:
            # GPU metrics
            try:
                gpu_count = int(subprocess.check_output(
                    ['nvidia-smi', '--query-gpu=gpu_name', '--format=csv,noheader'], 
                    text=True
                ).count('\n'))
            except:
                gpu_count = 0

            gpu_metrics = [self.get_gpu_metrics(i) for i in range(gpu_count)]
            current_tps = self.calculate_tps()

            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
            cpu_freq = psutil.cpu_freq()
            cpu_temp = psutil.sensors_temperatures().get('coretemp', [])
            
            cpu_metrics = {
                'utilization': cpu_percent,
                'frequency': float(cpu_freq.current) if cpu_freq else 0,
                'temperature': [t.current for t in cpu_temp] if cpu_temp else [],
                'core_count': psutil.cpu_count(logical=True)
            }
            
            if gpu_metrics:
                avg_util = sum(gpu.get('gpu_utilization', 0) for gpu in gpu_metrics) / len(gpu_metrics)
                avg_power = sum(gpu.get('power_draw', 0) for gpu in gpu_metrics) / len(gpu_metrics)
            else:
                avg_util = avg_power = 0

            metrics = {
                'timestamp': datetime.now().isoformat(),
                'gpu_metrics': gpu_metrics,
                'cpu_metrics': cpu_metrics,
                'tokens_per_second': current_tps,
                'peak_tps': self.peak_tps,
                'avg_gpu_utilization': avg_util,
                'power_draw': avg_power
            }

            self.historical_metrics.append(metrics)
            if len(self.historical_metrics) > 60:
                self.historical_metrics.pop(0)

            return metrics

        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            return {}

    def record_tokens(self, count: int):
        self.tokens_count += count
        logger.debug(f"Tokens recorded: {count}, Total: {self.tokens_count}")

    def reset_peaks(self):
        self.peak_tps = 0.0
        self.peak_gpu_util = 0.0
        self.peak_gpu_mem = 0.0
        self.tokens_count = 0
        self.tokens_last_window = 0
        self.last_update = time.time()
        self.historical_metrics.clear()

metrics_collector = MetricsCollector()

def collect_metrics() -> Dict:
    return metrics_collector.collect_metrics()

def record_tokens(count: int):
    metrics_collector.record_tokens(count)