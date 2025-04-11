# File: app/utils/logger.py
import logging
from pathlib import Path

# Create logs directory if it doesn't exist
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        # Console handler
        logging.StreamHandler(),
        # File handler
        logging.FileHandler(log_dir / "benchmark.log")
    ]
)

# Create logger
logger = logging.getLogger("benchmark-system")

# Set log levels
logger.setLevel(logging.INFO)

# Add some utility functions for common logging patterns
def log_benchmark_start(benchmark_id: int, config: dict):
    logger.info(f"Starting benchmark {benchmark_id} with config: {config}")

def log_benchmark_complete(benchmark_id: int, results: dict):
    logger.info(f"Completed benchmark {benchmark_id}. Results: {results}")

def log_nim_operation(operation: str, image_name: str, success: bool, details: str = ""):
    status = "succeeded" if success else "failed"
    logger.info(f"NIM operation '{operation}' on {image_name} {status}. {details}")

def log_error(error_type: str, error: Exception, details: str = ""):
    logger.error(f"{error_type}: {str(error)}. {details}")
