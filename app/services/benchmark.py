# Update to app/services/benchmark.py
# Only the relevant sections with changes

async def execute_benchmark(self, config: Dict[str, Any], model_info: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a benchmark against an Ollama model with improved batching support."""
    try:
        model_name = model_info['name']
        logger.info(f"Starting benchmark for {model_name}")

        success_count = 0
        total_tokens = 0
        total_latency = 0
        peak_tps = 0.0
        latencies = []
        start_time = datetime.now()
        gpu_metrics_history = []
        
        # For tracking token generation performance
        model_tokens_per_second = 0.0
        model_tokens_generated = 0

        # Start metrics collection task
        async def collect_metrics():
            while True:
                try:
                    metrics = metrics_collector.collect_metrics()
                    gpu_metrics_history.append(metrics)
                    await asyncio.sleep(1)  # Collect every second
                except Exception as e:
                    logger.error(f"Metrics collection error: {e}")

        metrics_task = asyncio.create_task(collect_metrics())

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
                nonlocal success_count, total_tokens, total_latency, peak_tps, model_tokens_per_second, model_tokens_generated
                async with semaphore:
                    try:
                        req_start = datetime.now()
                        
                        # Format the request for Ollama
                        data = {
                            "model": model,
                            "prompt": config['prompt'],
                            "stream": use_streaming,
                            "options": options
                        }
                        
                        logger.debug(f"Sending request with settings: {data}")
                        
                        async with aiohttp.ClientSession() as session:
                            async with session.post(
                                f"{ollama_manager.base_url}/api/generate",
                                json=data,
                                timeout=120  # Longer timeout for generation
                            ) as response:
                                if response.status != 200:
                                    logger.error(f"Request failed with status {response.status}")
                                    return

                                if use_streaming:
                                    # Handle streaming response with improved token counting
                                    tokens = 0
                                    async for line in response.content:
                                        try:
                                            chunk = json.loads(line)
                                            # Use eval_count from streaming chunks if available
                                            if 'eval_count' in chunk:
                                                tokens = chunk.get('eval_count', 0)
                                            elif chunk.get('response'):
                                                # Fallback to text-based counting
                                                tokens += len(chunk['response'].split())
                                        except json.JSONDecodeError:
                                            continue
                                else:
                                    # Handle non-streaming response
                                    data = await response.json()
                                    
                                    # Use Ollama's eval_count for accurate token count
                                    if 'eval_count' in data:
                                        tokens = data['eval_count']
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

                                latency = (datetime.now() - req_start).total_seconds()
                                success_count += 1
                                total_tokens += tokens
                                total_latency += latency
                                latencies.append(latency)

                                # Calculate current and peak TPS based on wall-clock time
                                elapsed = (datetime.now() - start_time).total_seconds()
                                current_tps = total_tokens / elapsed if elapsed > 0 else 0
                                peak_tps = max(peak_tps, current_tps)

                                # Update real-time metrics
                                self.current_benchmark_metrics = {
                                    "tokens_per_second": current_tps,
                                    "peak_tps": peak_tps,
                                    "latency": sum(latencies) / len(latencies) if latencies else 0,
                                    "timestamp": datetime.now().isoformat(),
                                    "completed_requests": success_count,
                                    "total_requests": config['total_requests']
                                }

                    except Exception as e:
                        logger.error(f"Request error: {str(e)}")

            # For non-streaming mode, we can use pseudo-batching for better performance
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
                raise Exception("No successful requests completed")

            # Process GPU metrics
            if gpu_metrics_history:
                avg_metrics = gpu_metrics_history[-1]  # Get latest metrics
                gpu_metrics = [{
                    'gpu_utilization': gpu.get('gpu_utilization', 0),
                    'gpu_memory_used': gpu.get('gpu_memory_used', 0),
                    'gpu_temp': gpu.get('gpu_temp', 0),
                    'power_draw': gpu.get('power_draw', 0)
                } for gpu in avg_metrics.get('gpu_metrics', [])]
                avg_power = avg_metrics.get('power_draw', 0)
            else:
                gpu_metrics = []
                avg_power = 0

            tokens_per_watt = (total_tokens / total_latency) / avg_power if avg_power > 0 else 0

            # Wall clock time (real throughput)
            wall_clock_duration = (datetime.now() - start_time).total_seconds()
            wall_clock_tps = total_tokens / wall_clock_duration if wall_clock_duration > 0 else 0

            # Calculate final metrics
            metrics = {
                # Overall system throughput (wall clock)
                "tokens_per_second": wall_clock_tps,
                # Model-only processing performance
                "model_tokens_per_second": model_tokens_per_second,
                "peak_tps": peak_tps,
                "latency": sum(latencies) / len(latencies),
                "p95_latency": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
                "time_to_first_token": min(latencies) if latencies else 0,
                "inter_token_latency": (max(latencies) - min(latencies)) / len(latencies) if len(latencies) > 1 else 0,
                "gpu_metrics": gpu_metrics,
                "total_tokens": total_tokens,
                "tokens_per_watt": tokens_per_watt,
                "successful_requests": success_count,
                "failed_requests": config['total_requests'] - success_count,
                "model_name": model_name,
                "wall_clock_duration": wall_clock_duration,
                "streaming_enabled": use_streaming,
                "batch_size": batch_size,
                "historical": [{
                    "timestamp": datetime.now().isoformat(),
                    "tokens_per_second": wall_clock_tps,
                    "latency": l
                } for l in latencies]
            }

            logger.info(f"Benchmark complete: {success_count}/{config['total_requests']} requests successful")
            return metrics

        finally:
            metrics_task.cancel()
            try:
                await metrics_task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"Benchmark execution error: {str(e)}")
        raise
