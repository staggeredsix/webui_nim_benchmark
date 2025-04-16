# app/services/benchmark.py
import json
import asyncio
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from ..utils.logger import logger
from ..services.ollama import ollama_manager
from ..services.vllm import vllm_manager
from ..services.container import container_manager
from ..utils.metrics import metrics_collector

class BenchmarkService:
    def __init__(self, benchmark_dir: str = "benchmarks"):
        self.benchmark_dir = Path(benchmark_dir)
        self.benchmark_dir.mkdir(exist_ok=True)
        self.current_benchmark_metrics = {}

    async def execute_benchmark(self, config: Dict[str, Any], model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a benchmark based on the specified backend."""
        backend = config.get('backend', 'ollama')
        
        if backend == 'ollama':
            return await self.execute_ollama_benchmark(config, model_info)
        elif backend == 'vllm':
            return await self.execute_vllm_benchmark(config, model_info)
        elif backend == 'nim':
            return await self.execute_nim_benchmark(config, model_info)
        else:
            raise ValueError(f"Unsupported backend: {backend}")

    async def execute_ollama_benchmark(self, config: Dict[str, Any], model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a benchmark against an Ollama model with improved metrics."""
        try:
            model_name = model_info['name']
            logger.info(f"Starting Ollama benchmark for {model_name}")
            logger.info(f"Model info: {model_info}")
            logger.info(f"Benchmark config: {config}")

            # Reset metrics collector and start in background thread
            metrics_collector.reset_peaks()
            metrics_collector.start_collector(interval=0.5)  # Collect twice per second
            
            success_count = 0
            total_tokens = 0
            total_latency = 0
            latencies = []
            ttfts = []  # Time To First Token measurements
            inter_token_latencies = []
            start_time = datetime.now()
            
            # For tracking token generation performance
            model_tokens_per_second = 0.0
            model_tokens_generated = 0

            try:
                # Use streaming setting with proper default (true for interactive, false for benchmarks)
                use_streaming = config.get('stream', False)
                
                # Set up batch size - only applicable for non-streaming mode
                batch_size = config.get('batch_size', 1) if not use_streaming else 1
                
                # Set up request batches based on concurrency and batching
                semaphore = asyncio.Semaphore(config['concurrency_level'])
                model = model_name
                
                # Format options with proper context length if specified
                options = {
                    "num_predict": config.get('max_tokens', 50),
                    "temperature": config.get('temperature', 0.7),
                    "top_p": config.get('top_p', 0.9),
                    "top_k": config.get('top_k', 40),
                }
                
                # Add context length if specified
                if config.get('context_size') and config.get('context_size') != "auto":
                    options["num_ctx"] = int(config.get('context_size'))
                    
                async def make_request():
                    nonlocal success_count, total_tokens, total_latency
                    async with semaphore:
                        try:
                            req_start = datetime.now()
                            first_token_time = None
                            
                            # Format the request for Ollama
                            data = {
                                "model": model,
                                "prompt": config['prompt'],
                                "stream": use_streaming,
                                "options": options
                            }
                            
                            logger.debug(f"Sending request with settings: {data}")
                            
                            async with aiohttp.ClientSession() as session:
                                try:
                                    async with session.post(
                                        f"{ollama_manager.base_url}/api/generate",
                                        json=data,
                                        timeout=120  # Longer timeout for generation
                                    ) as response:
                                        if response.status != 200:
                                            error_text = await response.text()
                                            logger.error(f"Request failed with status {response.status}: {error_text}")
                                            return

                                        if use_streaming:
                                            # Handle streaming response with accurate token counting
                                            tokens = 0
                                            token_timestamps = []
                                            
                                            async for line in response.content:
                                                try:
                                                    chunk = json.loads(line)
                                                    # Record first token timestamp
                                                    if not first_token_time and chunk.get('response'):
                                                        first_token_time = datetime.now()
                                                        ttft = (first_token_time - req_start).total_seconds() * 1000
                                                        ttfts.append(ttft)
                                                    
                                                    # Record token timestamp for inter-token latency
                                                    if chunk.get('response'):
                                                        token_timestamps.append(datetime.now())
                                                    
                                                    # Use eval_count from streaming chunks if available
                                                    if 'eval_count' in chunk:
                                                        tokens = chunk.get('eval_count', 0)
                                                        # Record tokens for metrics collector
                                                        if tokens > 0:
                                                            metrics_collector.record_tokens(tokens)
                                                    elif chunk.get('response'):
                                                        # Only count new tokens as they appear
                                                        tokens += 1
                                                        metrics_collector.record_tokens(1)
                                                except json.JSONDecodeError as e:
                                                    logger.error(f"JSON decode error in streaming chunk: {str(e)}")
                                                    continue
                                            
                                            # Calculate inter-token latency if we have multiple tokens
                                            if len(token_timestamps) > 1:
                                                intervals = [(token_timestamps[i] - token_timestamps[i-1]).total_seconds() * 1000 
                                                            for i in range(1, len(token_timestamps))]
                                                if intervals:
                                                    inter_token_latencies.append(sum(intervals) / len(intervals))
                                            
                                            # For streaming, latency = total time from request to completion
                                            latency = (datetime.now() - req_start).total_seconds() * 1000  # Total response time in ms
                                        else:
                                            # Handle non-streaming response
                                            data = await response.json()
                                            
                                            # Use Ollama's eval_count for accurate token count
                                            if 'eval_count' in data:
                                                tokens = data['eval_count']
                                                # Record tokens for metrics collector
                                                metrics_collector.record_tokens(tokens)
                                                
                                                # Update model performance metrics if available
                                                if 'eval_duration' in data:
                                                    # Convert from nanoseconds to seconds
                                                    eval_duration_sec = data['eval_duration'] / 1_000_000_000
                                                    tokens_per_sec = tokens / eval_duration_sec if eval_duration_sec > 0 else 0
                                                    model_tokens_per_second = max(model_tokens_per_second, tokens_per_sec)
                                                    model_tokens_generated += tokens
                                            else:
                                                # Fallback to text-based counting
                                                tokens = len(data.get('response', '').split())
                                                metrics_collector.record_tokens(tokens)

                                            # For non-streaming, time to first token is essentially request latency
                                            ttfts.append((datetime.now() - req_start).total_seconds() * 1000)
                                            
                                            # For non-streaming, measure full response latency
                                            latency = (datetime.now() - req_start).total_seconds() * 1000  # ms

                                        success_count += 1
                                        total_tokens += tokens
                                        total_latency += latency
                                        latencies.append(latency)
                                        
                                        logger.debug(f"Request succeeded: {tokens} tokens, {latency:.2f}ms latency")
                                
                                except aiohttp.ClientError as e:
                                    logger.error(f"HTTP request error: {type(e).__name__} - {str(e)}")
                                except aiohttp.ServerTimeoutError:
                                    logger.error("Request timed out after 120 seconds")
                                except Exception as e:
                                    logger.error(f"Request processing error: {type(e).__name__} - {str(e)}")

                        except json.JSONDecodeError as e:
                            logger.error(f"JSON decode error: {str(e)}")
                        except Exception as e:
                            logger.error(f"Request error: {type(e).__name__} - {str(e)}", exc_info=True)

                # Run the benchmark requests
                if not use_streaming and batch_size > 1:
                    total_requests = config['total_requests']
                    batches = [list(range(i, min(i + batch_size, total_requests))) 
                              for i in range(0, total_requests, batch_size)]
                    
                    logger.info(f"Running {len(batches)} batches with batch_size={batch_size}")
                    
                    for batch_idx, batch in enumerate(batches):
                        batch_tasks = [make_request() for _ in batch]
                        await asyncio.gather(*batch_tasks)
                        logger.info(f"Completed batch {batch_idx+1}/{len(batches)}")
                else:
                    # Create and run concurrent requests (non-batched)
                    tasks = [make_request() for _ in range(config['total_requests'])]
                    await asyncio.gather(*tasks)

                if not latencies:
                    logger.error(f"No successful requests completed for model {model_name}")
                    raise Exception("No successful requests completed")

                # Process GPU metrics
                peak_metrics = metrics_collector.get_peaks()
                
                # Wall clock time (real throughput)
                wall_clock_duration = (datetime.now() - start_time).total_seconds()
                wall_clock_tps = total_tokens / wall_clock_duration if wall_clock_duration > 0 else 0

                # Calculate p95 latency
                sorted_latencies = sorted(latencies)
                p95_idx = int(len(sorted_latencies) * 0.95)
                p95_latency = sorted_latencies[p95_idx] if sorted_latencies else 0
                
                # Calculate time to first token (TTFT)
                avg_ttft = sum(ttfts) / len(ttfts) if ttfts else 0
                
                # Calculate inter-token latency
                avg_itl = sum(inter_token_latencies) / len(inter_token_latencies) if inter_token_latencies else 0

                # Get last GPU metrics snapshot
                gpu_metrics_snapshot = metrics_collector.collect_metrics().get('gpu_metrics', [])
                
                # Calculate final metrics
                metrics = {
                    # Overall system throughput (wall clock)
                    "tokens_per_second": wall_clock_tps,
                    # Model-only processing performance
                    "model_tokens_per_second": model_tokens_per_second,
                    "peak_tps": peak_metrics["peak_tps"],
                    "latency": sum(latencies) / len(latencies),
                    "p95_latency": p95_latency,
                    "time_to_first_token": avg_ttft,
                    "inter_token_latency": avg_itl,
                    "gpu_metrics": gpu_metrics_snapshot,
                    "total_tokens": total_tokens,
                    "peak_gpu_utilization": peak_metrics["peak_gpu_util"],
                    "peak_gpu_memory": peak_metrics["peak_gpu_mem"],
                    "peak_gpu_memory_mb": peak_metrics["peak_gpu_mem"],
                    "successful_requests": success_count,
                    "failed_requests": config['total_requests'] - success_count,
                    "model_name": model_name,
                    "wall_clock_duration": wall_clock_duration,
                    "streaming_enabled": use_streaming,
                    "batch_size": batch_size,
                    "backend": "ollama"
                }

                logger.info(f"Benchmark complete: {success_count}/{config['total_requests']} requests successful")
                return metrics

            finally:
                # Stop the metrics collector thread
                metrics_collector.stop_collector()

        except Exception as e:
            logger.error(f"Benchmark execution error: {str(e)}")
            raise

    async def execute_vllm_benchmark(self, config: Dict[str, Any], model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a benchmark against a vLLM model."""
        try:
            model_name = model_info['name']
            logger.info(f"Starting vLLM benchmark for {model_name}")
            logger.info(f"Model info: {model_info}")
            logger.info(f"Benchmark config: {config}")

            # Reset metrics collector and start in background thread
            metrics_collector.reset_peaks()
            metrics_collector.start_collector(interval=0.5)
            
            success_count = 0
            total_tokens = 0
            total_latency = 0
            latencies = []
            ttfts = []
            start_time = datetime.now()
            
            try:
                # vLLM supports streaming or non-streaming
                use_streaming = config.get('stream', False)
                
                # Set up concurrency
                semaphore = asyncio.Semaphore(config['concurrency_level'])
                
                # vLLM generation parameters
                gen_params = {
                    "max_tokens": config.get('max_tokens', 50),
                    "temperature": config.get('temperature', 0.7),
                    "top_p": config.get('top_p', 0.9),
                    "top_k": config.get('top_k', 40),
                }
                
                async def make_request():
                    nonlocal success_count, total_tokens, total_latency
                    async with semaphore:
                        try:
                            req_start = datetime.now()
                            first_token_time = None
                            
                            # Format the request for vLLM (OpenAI-compatible API)
                            data = {
                                "model": model_name,
                                "prompt": config['prompt'],
                                "stream": use_streaming,
                                **gen_params
                            }
                            
                            logger.debug(f"Sending vLLM request with settings: {data}")
                            
                            async with aiohttp.ClientSession() as session:
                                try:
                                    endpoint = f"{vllm_manager.base_url}/v1/completions"
                                    async with session.post(
                                        endpoint,
                                        json=data,
                                        timeout=120
                                    ) as response:
                                        if response.status != 200:
                                            error_text = await response.text()
                                            logger.error(f"vLLM request failed with status {response.status}: {error_text}")
                                            return

                                        if use_streaming:
                                            # Handle streaming response
                                            tokens = 0
                                            token_timestamps = []
                                            
                                            async for line in response.content:
                                                try:
                                                    line = line.decode('utf-8').strip()
                                                    if not line or line == "data: [DONE]":
                                                        continue
                                                        
                                                    if line.startswith("data: "):
                                                        line = line[6:]  # Remove "data: " prefix
                                                    
                                                    chunk = json.loads(line)
                                                    
                                                    # Record first token timestamp
                                                    if not first_token_time and chunk.get('choices', [{}])[0].get('text'):
                                                        first_token_time = datetime.now()
                                                        ttft = (first_token_time - req_start).total_seconds() * 1000
                                                        ttfts.append(ttft)
                                                    
                                                    # Count tokens
                                                    if 'choices' in chunk and len(chunk['choices']) > 0:
                                                        new_token = chunk['choices'][0].get('text', '')
                                                        if new_token:
                                                            tokens += 1
                                                            metrics_collector.record_tokens(1)
                                                            token_timestamps.append(datetime.now())
                                                            
                                                except json.JSONDecodeError as e:
                                                    logger.error(f"JSON decode error in vLLM streaming chunk: {str(e)}")
                                                    continue
                                            
                                            # For streaming, latency = total time from request to completion
                                            latency = (datetime.now() - req_start).total_seconds() * 1000
                                        else:
                                            # Handle non-streaming response
                                            data = await response.json()
                                            
                                            # Count tokens from the completion
                                            if 'choices' in data and len(data['choices']) > 0:
                                                completion_text = data['choices'][0].get('text', '')
                                                tokens = len(completion_text.split())
                                                metrics_collector.record_tokens(tokens)
                                            
                                            # Use usage info if available
                                            if 'usage' in data and 'completion_tokens' in data['usage']:
                                                tokens = data['usage']['completion_tokens']
                                                metrics_collector.record_tokens(tokens)

                                            # For non-streaming, time to first token is essentially request latency
                                            ttfts.append((datetime.now() - req_start).total_seconds() * 1000)
                                            
                                            # For non-streaming, measure full response latency
                                            latency = (datetime.now() - req_start).total_seconds() * 1000

                                        success_count += 1
                                        total_tokens += tokens
                                        total_latency += latency
                                        latencies.append(latency)
                                        
                                        logger.debug(f"vLLM request succeeded: {tokens} tokens, {latency:.2f}ms latency")
                                
                                except aiohttp.ClientError as e:
                                    logger.error(f"vLLM HTTP request error: {type(e).__name__} - {str(e)}")
                                except aiohttp.ServerTimeoutError:
                                    logger.error("vLLM request timed out after 120 seconds")
                                except Exception as e:
                                    logger.error(f"vLLM request processing error: {type(e).__name__} - {str(e)}")

                        except json.JSONDecodeError as e:
                            logger.error(f"vLLM JSON decode error: {str(e)}")
                        except Exception as e:
                            logger.error(f"vLLM request error: {type(e).__name__} - {str(e)}", exc_info=True)

                # Create and run concurrent requests
                tasks = [make_request() for _ in range(config['total_requests'])]
                await asyncio.gather(*tasks)

                if not latencies:
                    logger.error(f"No successful requests completed for vLLM model {model_name}")
                    raise Exception("No successful vLLM requests completed")

                # Process metrics similar to Ollama benchmark
                peak_metrics = metrics_collector.get_peaks()
                
                wall_clock_duration = (datetime.now() - start_time).total_seconds()
                wall_clock_tps = total_tokens / wall_clock_duration if wall_clock_duration > 0 else 0

                sorted_latencies = sorted(latencies)
                p95_idx = int(len(sorted_latencies) * 0.95)
                p95_latency = sorted_latencies[p95_idx] if sorted_latencies else 0
                
                avg_ttft = sum(ttfts) / len(ttfts) if ttfts else 0
                
                gpu_metrics_snapshot = metrics_collector.collect_metrics().get('gpu_metrics', [])
                
                metrics = {
                    "tokens_per_second": wall_clock_tps,
                    "peak_tps": peak_metrics["peak_tps"],
                    "latency": sum(latencies) / len(latencies),
                    "p95_latency": p95_latency,
                    "time_to_first_token": avg_ttft,
                    "gpu_metrics": gpu_metrics_snapshot,
                    "total_tokens": total_tokens,
                    "peak_gpu_utilization": peak_metrics["peak_gpu_util"],
                    "peak_gpu_memory": peak_metrics["peak_gpu_mem"],
                    "peak_gpu_memory_mb": peak_metrics["peak_gpu_mem"],
                    "successful_requests": success_count,
                    "failed_requests": config['total_requests'] - success_count,
                    "model_name": model_name,
                    "wall_clock_duration": wall_clock_duration,
                    "streaming_enabled": use_streaming,
                    "backend": "vllm"
                }

                logger.info(f"vLLM benchmark complete: {success_count}/{config['total_requests']} requests successful")
                return metrics

            finally:
                metrics_collector.stop_collector()

        except Exception as e:
            logger.error(f"vLLM benchmark execution error: {str(e)}")
            raise

    async def execute_nim_benchmark(self, config: Dict[str, Any], container_info: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a benchmark against a NIM container."""
        try:
            # For NIM, we need to extract information from the container
            model_name = container_info.get('model_info', {}).get('full_name', 'unknown_model')
            logger.info(f"Starting NIM benchmark for {model_name}")
            logger.info(f"Container info: {container_info}")
            logger.info(f"Benchmark config: {config}")

            # Reset metrics and start collector
            metrics_collector.reset_peaks()
            metrics_collector.start_collector(interval=0.5)
            
            success_count = 0
            total_tokens = 0
            total_latency = 0
            latencies = []
            ttfts = []
            start_time = datetime.now()
            
            try:
                # NIM typically uses the OpenAI-compatible API
                port = container_info.get('port', 8000)
                endpoint = f"http://localhost:{port}/v1/completions"
                
                # Set up concurrency
                semaphore = asyncio.Semaphore(config['concurrency_level'])
                
                async def make_request():
                    nonlocal success_count, total_tokens, total_latency
                    async with semaphore:
                        try:
                            req_start = datetime.now()
                            
                            # Format request for NIM
                            data = {
                                "model": model_name,
                                "prompt": config['prompt'],
                                "max_tokens": config.get('max_tokens', 50),
                                "temperature": config.get('temperature', 0.7),
                                "top_p": config.get('top_p', 0.9)
                            }
                            
                            logger.debug(f"Sending NIM request with settings: {data}")
                            
                            async with aiohttp.ClientSession() as session:
                                try:
                                    async with session.post(
                                        endpoint,
                                        json=data,
                                        timeout=120
                                    ) as response:
                                        if response.status != 200:
                                            error_text = await response.text()
                                            logger.error(f"NIM request failed with status {response.status}: {error_text}")
                                            return

                                        # Parse response
                                        data = await response.json()
                                        
                                        # Calculate response metrics
                                        completion_text = ""
                                        if 'choices' in data and len(data['choices']) > 0:
                                            completion_text = data['choices'][0].get('text', '')
                                        
                                        # Count tokens (either from usage or estimate from text)
                                        tokens = 0
                                        if 'usage' in data and 'completion_tokens' in data['usage']:
                                            tokens = data['usage']['completion_tokens']
                                        else:
                                            tokens = len(completion_text.split())
                                            
                                        metrics_collector.record_tokens(tokens)
                                        
                                        # Add response time
                                        latency = (datetime.now() - req_start).total_seconds() * 1000
                                        ttfts.append(latency)  # For NIM, we use full latency as TTFT

                                        success_count += 1
                                        total_tokens += tokens
                                        total_latency += latency
                                        latencies.append(latency)
                                        
                                        logger.debug(f"NIM request succeeded: {tokens} tokens, {latency:.2f}ms latency")
                                
                                except aiohttp.ClientError as e:
                                    logger.error(f"NIM HTTP request error: {type(e).__name__} - {str(e)}")
                                except aiohttp.ServerTimeoutError:
                                    logger.error("NIM request timed out after 120 seconds")
                                except Exception as e:
                                    logger.error(f"NIM request processing error: {type(e).__name__} - {str(e)}")

                        except json.JSONDecodeError as e:
                            logger.error(f"NIM JSON decode error: {str(e)}")
                        except Exception as e:
                            logger.error(f"NIM request error: {type(e).__name__} - {str(e)}", exc_info=True)

                # Create and run concurrent requests
                tasks = [make_request() for _ in range(config['total_requests'])]
                await asyncio.gather(*tasks)

                if not latencies:
                    logger.error(f"No successful requests completed for NIM model {model_name}")
                    raise Exception("No successful NIM requests completed")

                # Process metrics
                peak_metrics = metrics_collector.get_peaks()
                
                wall_clock_duration = (datetime.now() - start_time).total_seconds()
                wall_clock_tps = total_tokens / wall_clock_duration if wall_clock_duration > 0 else 0

                sorted_latencies = sorted(latencies)
                p95_idx = int(len(sorted_latencies) * 0.95)
                p95_latency = sorted_latencies[p95_idx] if sorted_latencies else 0
                
                avg_ttft = sum(ttfts) / len(ttfts) if ttfts else 0
                
                gpu_metrics_snapshot = metrics_collector.collect_metrics().get('gpu_metrics', [])
                
                metrics = {
                    "tokens_per_second": wall_clock_tps,
                    "peak_tps": peak_metrics["peak_tps"],
                    "latency": sum(latencies) / len(latencies),
                    "p95_latency": p95_latency,
                    "time_to_first_token": avg_ttft,
                    "gpu_metrics": gpu_metrics_snapshot,
                    "total_tokens": total_tokens,
                    "peak_gpu_utilization": peak_metrics["peak_gpu_util"],
                    "peak_gpu_memory": peak_metrics["peak_gpu_mem"],
                    "peak_gpu_memory_mb": peak_metrics["peak_gpu_mem"],
                    "successful_requests": success_count,
                    "failed_requests": config['total_requests'] - success_count,
                    "model_name": model_name,
                    "wall_clock_duration": wall_clock_duration,
                    "backend": "nim"
                }

                logger.info(f"NIM benchmark complete: {success_count}/{config['total_requests']} requests successful")
                return metrics

            finally:
                metrics_collector.stop_collector()

        except Exception as e:
            logger.error(f"NIM benchmark execution error: {str(e)}")
            raise

    async def create_benchmark(self, config: Dict[str, Any]) -> Dict[str, Any]:
        try:
            backend = config.get('backend', 'ollama')
            
            # Get model info based on backend type
            model_info = None
            if backend == 'ollama':
                model_info = await ollama_manager.get_model_info(config['model_id'])
                if not model_info:
                    raise Exception(f"Ollama model {config['model_id']} not found")
            elif backend == 'vllm':
                model_info = await vllm_manager.get_model_info(config['model_id'])
                if not model_info:
                    raise Exception(f"vLLM model {config['model_id']} not found")
            elif backend == 'nim':
                # For NIM, we need to start the container
                container_info = await container_manager.start_container(
                    config['nim_id'], 
                    config.get('gpu_count', 1)
                )
                if not container_info:
                    raise Exception("Failed to start NIM container")
                model_info = container_info
            else:
                raise Exception(f"Unsupported backend: {backend}")

            # Execute benchmark
            try:
                metrics = await self.execute_benchmark(config, model_info)
                
                # Create safe filename from benchmark name
                safe_name = "".join(c for c in config['name'] if c.isalnum() or c in ('-', '_')).strip()
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                benchmark_file = self.benchmark_dir / f"benchmark_{safe_name}_{timestamp}.json"

                run_data = {
                    "id": len(self.get_benchmark_history()) + 1,
                    "name": config['name'],
                    "model_name": metrics['model_name'],
                    "backend": backend,
                    "status": "completed",
                    "start_time": datetime.now().isoformat(),
                    "end_time": datetime.now().isoformat(),
                    "config": config,
                    "metrics": metrics
                }

                with open(benchmark_file, "w") as f:
                    json.dump(run_data, f, indent=2)

                logger.info(f"Benchmark results saved to {benchmark_file}")
                return run_data
            finally:
                # Clean up NIM container if necessary
                if backend == 'nim' and model_info and model_info.get('container_id'):
                    try:
                        await container_manager.stop_container(model_info['container_id'])
                    except Exception as e:
                        logger.error(f"Error stopping NIM container: {str(e)}")

        except Exception as e:
            logger.error(f"Benchmark creation error: {str(e)}")
            raise

    def get_benchmark_history(self) -> List[Dict[str, Any]]:
        try:
            history = []
            for file_path in self.benchmark_dir.glob("benchmark_*.json"):
                try:
                    with open(file_path, "r") as f:
                        history.append(json.load(f))
                except json.JSONDecodeError:
                    logger.error(f"Error reading benchmark file: {file_path}")
                    continue
            return sorted(history, key=lambda x: x.get("id", 0), reverse=True)
        except Exception as e:
            logger.error(f"Error reading benchmark history: {e}")
            return []
            
    def get_benchmark(self, run_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific benchmark run by ID."""
        try:
            history = self.get_benchmark_history()
            for run in history:
                if run.get("id") == run_id:
                    return run
            return None
        except Exception as e:
            logger.error(f"Error getting benchmark run: {e}")
            return None

benchmark_service = BenchmarkService()

__all__ = ['benchmark_service']
