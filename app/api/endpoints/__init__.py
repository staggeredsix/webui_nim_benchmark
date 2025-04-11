# app/api/endpoints/__init__.py

from .nim import router as nim_router
from .ngc import router as ngc_router
from .benchmark_config import get_benchmark_config
__all__ = ['nim_router', 'ngc_router']
