from app.utils.ngc_key_helper import key_exists

class BenchmarkConfig:
    NGC_API_KEY = None  # Initialize the NGC API key here

def get_benchmark_config():
    return BenchmarkConfig()