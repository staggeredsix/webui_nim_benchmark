# app/services/benchmark.py
import json
import asyncio
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from ..utils.logger import logger
from ..services.container import container_manager

class BenchmarkService:
    def __init__(self, benchmark_dir: str = "benchmarks"):
        self.benchmark_dir = Path(benchmark_dir)
        self.benchmark_dir.mkdir(exist_ok=True)
        self.current_benchmark_metrics = {}

    def _format_gpu_metrics(self, raw_metrics: Dict) -> Dict:
        return {
            'gpu_utilization': raw_metrics.get('gpu_utilization', 0),
            'gpu_memory_used': raw_metrics.get('gpu_memory_used', 0),
            'gpu_memory_total': raw_metrics.get('gpu_memory_total', 0),
            'gpu_temp': raw_metrics.get('gpu_temp', 0),
            'power_draw': raw_metrics.get('power_draw', 0)
        }

    async def execute_nim_benchmark(self, config: Dict[str, Any], container_info: Dict[str, Any]) -> Dict[str, Any]:
        try:
            port = container_info['port']
            image_name = container_info['image_name']
            
            # Extract model info from image name
            parts = image_name.split('/')
            model_name = parts[-1].split(':')[0]
            developer = parts[-2]
            model_path = f"{developer}/{model_name}"

            endpoint = f"http://localhost:8000/v1/completions"
            
            success_count = 0
            total_tokens = 0
            total_latency = 0
            latencies = []
            start_time = datetime.now()

            async with aiohttp.ClientSession() as session:
                tasks = []
                semaphore = asyncio.Semaphore(config['concurrency_level'])
                
                async def make_request():
                    nonlocal success_count, total_tokens, total_latency
                    try:
                        req_start = datetime.now()
                        async with session.post(endpoint, json={
                            "prompt": config['prompt'],
                            "max_tokens": config.get('max_tokens', 50),
                            "model": model_path
                        }) as response:
                            data = await response.json()
                            latency = (datetime.now() - req_start).total_seconds()
                            tokens = len(data.get("choices", [{}])[0].get("text", "").split())
                            
                            success_count += 1
                            total_tokens += tokens
                            total_latency += latency
                            latencies.append(latency)

                            # Update current metrics for websocket
                            elapsed = (datetime.now() - start_time).total_seconds()
                            self.current_benchmark_metrics = {
                                "tokens_per_second": total_tokens / elapsed if elapsed > 0 else 0,
                                "latency": sum(latencies) / len(latencies) if latencies else 0,
                                "timestamp": datetime.now().isoformat()
                            }
                    except Exception as e:
                        logger.error(f"Request error: {str(e)}")

                tasks = [make_request() for _ in range(config['total_requests'])]
                await asyncio.gather(*tasks)

            if not latencies:
                raise Exception("No successful requests completed")

            return {
                "tokens_per_second": total_tokens / total_latency if total_latency > 0 else 0,
                "latency": sum(latencies) / len(latencies),
                "gpu_metrics": [self._format_gpu_metrics(m) for m in container_info.get('gpu_metrics', [])],
                "total_tokens": total_tokens,
                "successful_requests": success_count,
                "failed_requests": config['total_requests'] - success_count,
                "model_name": model_path,
                "historical": [{
                    "timestamp": datetime.now().isoformat(),
                    "tokens_per_second": total_tokens / total_latency if total_latency > 0 else 0,
                    "latency": l
                } for l in latencies]
            }

        except Exception as e:
            logger.error(f"Benchmark execution error: {str(e)}")
            raise

    async def create_benchmark(self, config: Dict[str, Any]) -> Dict[str, Any]:
        container_info = None
        try:
            container_info = await container_manager.start_container(
                config['nim_id'], 
                config.get('gpu_count', 1)
            )
            if not container_info:
                raise Exception("Failed to start NIM container")

            await asyncio.sleep(5)  # Wait for container startup
            metrics = await self.execute_nim_benchmark(config, container_info)
            
            run_data = {
                "id": len(self.get_benchmark_history()) + 1,
                "name": config['name'],
                "model_name": metrics['model_name'],
                "status": "completed",
                "start_time": datetime.utcnow().isoformat(),
                "end_time": datetime.utcnow().isoformat(),
                "config": config,
                "metrics": metrics
            }

            # Save benchmark results
            with open(self.benchmark_dir / f"benchmark_{run_data['id']}.json", "w") as f:
                json.dump(run_data, f, indent=2)

            return run_data

        except Exception as e:
            logger.error(f"Benchmark creation error: {str(e)}")
            raise
        finally:
            if container_info:
                try:
                    await container_manager.stop_container(container_info['container_id'])
                except Exception as e:
                    logger.error(f"Error stopping container: {str(e)}")

    def get_benchmark_history(self) -> List[Dict[str, Any]]:
        try:
            history = []
            for file_path in self.benchmark_dir.glob("benchmark_*.json"):
                with open(file_path, "r") as f:
                    history.append(json.load(f))
            return sorted(history, key=lambda x: x["id"], reverse=True)
        except Exception as e:
            logger.error(f"Error reading benchmark history: {e}")
            return []

benchmark_service = BenchmarkService()