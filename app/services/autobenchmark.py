# app/services/autobenchmark.py - Fixed version
import asyncio
import time
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import aiohttp

from ..utils.logger import logger
from ..services.ollama import ollama_manager
from ..utils.metrics import metrics_collector
from .benchmark import benchmark_service

class AutoBenchmarkService:
    def __init__(self, results_dir: str = "autobenchmark_results"):
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True)
        self.current_results = {}
        self.is_running = False
        self.should_stop = False
        
        # Performance thresholds
        self.MIN_ACCEPTABLE_TPS = 12.0  # Minimum acceptable tokens per second
        self.MAX_CONCURRENCY = 64  # Safety limit
        
        # Configuration steps
        self.CONCURRENCY_STEPS = [1, 2, 4, 8, 16, 24, 32, 48, 64]
        self.BATCH_SIZES = [1, 2, 4, 8]
        self.TOKEN_SIZES = [32, 128, 512]
        self.TEST_MODES = ["streaming", "batch"]

    async def run_auto_benchmark(self, model_id: str, base_prompt: str) -> Dict[str, Any]:
        """
        Run a comprehensive auto-benchmark that tests various configurations
        to find optimal settings for the model.
        """
        if self.is_running:
            logger.warning("Auto-benchmark is already running")
            raise Exception("Auto-benchmark is already running")
        
        try:
            logger.info(f"Starting auto-benchmark for model {model_id} with prompt: {base_prompt}")
            self.is_running = True
            self.should_stop = False
            self.current_results = {
                "model_id": model_id,
                "timestamp": datetime.now().isoformat(),
                "tests": [],
                "optimal_config": None,
                "status": "running"
            }
            
            # Test results for different configurations
            streaming_results = []
            batch_results = []
            
            # First, find the max token size this model can handle with basic settings
            try:
                max_supported_tokens = await self._find_max_token_size(model_id, base_prompt)
                logger.info(f"Maximum supported token size: {max_supported_tokens}")
            except Exception as e:
                logger.error(f"Error finding max token size: {str(e)}")
                max_supported_tokens = 32  # Default conservatively if test fails
            
            token_sizes = [size for size in self.TOKEN_SIZES if size <= max_supported_tokens]
            if not token_sizes:
                token_sizes = [32]  # Fallback to smallest size
                
            logger.info(f"Beginning auto-benchmark for model {model_id}")
            logger.info(f"Using token sizes: {token_sizes}")
            
            # Test streaming mode (concurrency only)
            logger.info("Testing streaming mode...")
            for concurrency in self.CONCURRENCY_STEPS:
                if self.should_stop:
                    break
                    
                try:
                    logger.info(f"Testing streaming mode with concurrency {concurrency}")
                    result = await self._run_benchmark_test(
                        model_id=model_id,
                        prompt=base_prompt,
                        concurrency=concurrency,
                        streaming=True,
                        batch_size=1,  # No batching in streaming mode
                        token_size=token_sizes[0]  # Use smallest token size for comparison
                    )
                    
                    streaming_results.append(result)
                    self.current_results["tests"].append(result)
                    logger.info(f"Streaming test completed: {result['tokens_per_second']} tokens/sec")
                    
                    # Stop increasing concurrency if performance drops below threshold
                    if result["tokens_per_second"] < self.MIN_ACCEPTABLE_TPS:
                        logger.info(f"Streaming performance dropped below threshold at concurrency {concurrency}")
                        break
                        
                    # Or if we've hit our max concurrency
                    if concurrency >= self.MAX_CONCURRENCY:
                        break
                except Exception as e:
                    logger.error(f"Error during streaming test with concurrency {concurrency}: {str(e)}")
                    # Add error result to show in UI
                    error_result = {
                        "name": f"auto_{model_id}_c{concurrency}_streaming_error",
                        "model_id": model_id,
                        "concurrency": concurrency,
                        "streaming": True,
                        "batch_size": 1,
                        "token_size": token_sizes[0],
                        "error": str(e),
                        "tokens_per_second": 0,
                        "latency": 0,
                        "timestamp": datetime.now().isoformat()
                    }
                    self.current_results["tests"].append(error_result)
            
            # Test batch mode with various batch sizes
            logger.info("Testing batch mode...")
            for concurrency in self.CONCURRENCY_STEPS:
                if self.should_stop:
                    break
                    
                # Try different batch sizes for each concurrency level
                for batch_size in [b for b in self.BATCH_SIZES if b <= concurrency]:
                    if self.should_stop:
                        break
                    
                    try:
                        logger.info(f"Testing batch mode with concurrency {concurrency}, batch size {batch_size}")
                        result = await self._run_benchmark_test(
                            model_id=model_id,
                            prompt=base_prompt,
                            concurrency=concurrency,
                            streaming=False,
                            batch_size=batch_size,
                            token_size=token_sizes[0]  # Use smallest token size for comparison
                        )
                        
                        batch_results.append(result)
                        self.current_results["tests"].append(result)
                        logger.info(f"Batch test completed: {result['tokens_per_second']} tokens/sec")
                        
                        # Stop if performance drops significantly
                        if result["tokens_per_second"] < self.MIN_ACCEPTABLE_TPS:
                            logger.info(f"Batch performance dropped below threshold at concurrency {concurrency}, batch size {batch_size}")
                            break
                    except Exception as e:
                        logger.error(f"Error during batch test with concurrency {concurrency}, batch size {batch_size}: {str(e)}")
                        # Add error result to show in UI
                        error_result = {
                            "name": f"auto_{model_id}_c{concurrency}_b{batch_size}_error",
                            "model_id": model_id,
                            "concurrency": concurrency,
                            "streaming": False,
                            "batch_size": batch_size,
                            "token_size": token_sizes[0],
                            "error": str(e),
                            "tokens_per_second": 0,
                            "latency": 0,
                            "timestamp": datetime.now().isoformat()
                        }
                        self.current_results["tests"].append(error_result)
                
                # Stop increasing concurrency if all batch sizes are below threshold
                if all(r["tokens_per_second"] < self.MIN_ACCEPTABLE_TPS for r in batch_results if r["concurrency"] == concurrency and "error" not in r):
                    break
                    
                # Or if we've hit our max concurrency
                if concurrency >= self.MAX_CONCURRENCY:
                    break
            
            # Once we have the best concurrency and mode, test with different token sizes
            if not self.should_stop:
                logger.info("Testing token size scaling...")
                
                # Find best configuration so far
                best_config = self._find_best_config(self.current_results["tests"])
                
                if best_config:
                    # Test larger token sizes with the best configuration
                    for token_size in [t for t in token_sizes if t > token_sizes[0]]:
                        if self.should_stop:
                            break
                        
                        try:
                            logger.info(f"Testing optimal config with token size {token_size}")
                            result = await self._run_benchmark_test(
                                model_id=model_id,
                                prompt=base_prompt,
                                concurrency=best_config["concurrency"],
                                streaming=best_config["streaming"],
                                batch_size=best_config["batch_size"],
                                token_size=token_size
                            )
                            
                            self.current_results["tests"].append(result)
                            logger.info(f"Token size test completed: {result['tokens_per_second']} tokens/sec")
                        except Exception as e:
                            logger.error(f"Error during token size test with size {token_size}: {str(e)}")
                            # Add error result to show in UI
                            error_result = {
                                "name": f"auto_{model_id}_token{token_size}_error",
                                "model_id": model_id,
                                "concurrency": best_config["concurrency"],
                                "streaming": best_config["streaming"],
                                "batch_size": best_config["batch_size"],
                                "token_size": token_size,
                                "error": str(e),
                                "tokens_per_second": 0,
                                "latency": 0,
                                "timestamp": datetime.now().isoformat()
                            }
                            self.current_results["tests"].append(error_result)
            
            # Find the optimal configuration
            self.current_results["optimal_config"] = self._find_best_config(self.current_results["tests"])
            self.current_results["status"] = "completed"
            
            # Save results to disk
            self._save_results()
            
            logger.info(f"Auto-benchmark completed for model {model_id}")
            if self.current_results["optimal_config"]:
                logger.info(f"Optimal configuration: {self.current_results['optimal_config']}")
            else:
                logger.warning("No optimal configuration found")
            
            return self.current_results
            
        except Exception as e:
            logger.error(f"Auto-benchmark error: {str(e)}", exc_info=True)
            self.current_results["status"] = "error"
            self.current_results["error"] = str(e)
            self._save_results()  # Save even if there's an error
            return self.current_results
        finally:
            self.is_running = False

    async def _find_max_token_size(self, model_id: str, prompt: str) -> int:
        """Test to find the maximum token size the model can handle."""
        test_sizes = [512, 256, 128, 64, 32]
        
        for size in test_sizes:
            try:
                logger.info(f"Testing max token size: {size}")
                # Simple test with minimal settings
                result = await self._run_benchmark_test(
                    model_id=model_id,
                    prompt=prompt,
                    concurrency=1,
                    streaming=False,
                    batch_size=1,
                    token_size=size,
                    total_requests=2  # Just a quick test
                )
                
                # If it works without error, this is our max size
                if result and not result.get("error"):
                    return size
            except Exception as e:
                logger.warning(f"Token size {size} failed: {str(e)}")
                continue
                
        # If all sizes fail, return a safe minimum
        return 32

    async def _run_benchmark_test(
        self, 
        model_id: str,
        prompt: str,
        concurrency: int,
        streaming: bool,
        batch_size: int,
        token_size: int,
        total_requests: int = 10  # Reduced for quicker tests
    ) -> Dict[str, Any]:
        """Run a single benchmark test with the given configuration."""
        try:
            config = {
                "name": f"auto_{model_id}_c{concurrency}_b{batch_size}_t{token_size}_{'stream' if streaming else 'batch'}",
                "model_id": model_id,
                "prompt": prompt,
                "total_requests": total_requests,
                "concurrency_level": concurrency,
                "max_tokens": token_size,
                "stream": streaming,
                "batch_size": batch_size if not streaming else 1,
            }
            
            logger.info(f"Running test: {config['name']} with config: {config}")
            
            # Reset metrics collector to get clean measurements
            metrics_collector.reset_peaks()
            
            # Get model info first
            model_info = await ollama_manager.get_model_info(model_id)
            if not model_info:
                raise Exception(f"Model {model_id} not found")
                
            # Run the benchmark
            start_time = time.time()
            test_result = await benchmark_service.execute_benchmark(config, model_info)
            duration = time.time() - start_time
            
            if not test_result:
                raise Exception("Benchmark execution returned no results")
                
            logger.info(f"Benchmark executed successfully: {test_result}")
            
            # Format the results
            result = {
                "name": config["name"],
                "model_id": model_id,
                "concurrency": concurrency,
                "streaming": streaming,
                "batch_size": batch_size,
                "token_size": token_size,
                "tokens_per_second": test_result.get("tokens_per_second", 0),
                "latency": test_result.get("latency", 0),
                "p95_latency": test_result.get("p95_latency", 0),
                "time_to_first_token": test_result.get("time_to_first_token", 0),
                "gpu_utilization": test_result.get("avg_gpu_utilization", 0),
                "gpu_memory": test_result.get("peak_gpu_memory", 0),
                "total_duration": duration,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Test completed: {result['name']}")
            logger.info(f"Tokens per second: {result['tokens_per_second']:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Benchmark test error: {str(e)}", exc_info=True)
            # Re-raise to propagate the error
            raise

    def _find_best_config(self, tests: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find the optimal configuration based on throughput, latency and stability."""
        if not tests:
            return None
            
        # Filter out tests with errors or very low performance
        valid_tests = [t for t in tests if "error" not in t and t["tokens_per_second"] >= self.MIN_ACCEPTABLE_TPS]
        
        if not valid_tests:
            # Fall back to the best performing test even if below threshold
            valid_tests = sorted(tests, key=lambda x: x.get("tokens_per_second", 0), reverse=True)
            if valid_tests:
                return valid_tests[0]
            return None
        
        # First, find the test with the highest throughput
        best_throughput = max(valid_tests, key=lambda x: x["tokens_per_second"])
        
        # Check if there are other tests within 10% of the best throughput but with better latency
        near_best = [
            t for t in valid_tests 
            if t["tokens_per_second"] >= best_throughput["tokens_per_second"] * 0.9
        ]
        
        if not near_best:
            return best_throughput
            
        # Among near-best throughput tests, find the one with the best latency
        best_config = min(near_best, key=lambda x: x["latency"])
        
        return best_config

    def _save_results(self):
        """Save the current results to disk."""
        try:
            result_file = self.results_dir / f"autobenchmark_{self.current_results['model_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(result_file, "w") as f:
                json.dump(self.current_results, f, indent=2)
            logger.info(f"Auto-benchmark results saved to {result_file}")
        except Exception as e:
            logger.error(f"Error saving auto-benchmark results: {str(e)}")

    def stop_running_benchmark(self):
        """Stop the currently running auto-benchmark."""
        if self.is_running:
            self.should_stop = True
            logger.info("Stopping auto-benchmark...")
            return {"status": "stopping"}
        return {"status": "not_running"}

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the auto-benchmark."""
        return {
            "is_running": self.is_running,
            "current_results": self.current_results
        }
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get the history of auto-benchmark runs with improved error handling."""
        try:
            history = []
            # Create the results directory if it doesn't exist
            self.results_dir.mkdir(exist_ok=True)
            
            for file_path in sorted(self.results_dir.glob("autobenchmark_*.json"), reverse=True):
                try:
                    with open(file_path, "r") as f:
                        data = json.load(f)
                        # Ensure tests is always defined as an array
                        if "tests" not in data:
                            data["tests"] = []
                        history.append(data)
                except json.JSONDecodeError:
                    logger.error(f"Error reading auto-benchmark file: {file_path}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error reading {file_path}: {str(e)}")
                    continue
                    
            # Ensure we return at least an empty array rather than None
            return history if history else []
        except Exception as e:
            logger.error(f"Error reading auto-benchmark history: {e}")
            # Return an empty array instead of None
            return []

# Create a singleton instance
auto_benchmark_service = AutoBenchmarkService()
