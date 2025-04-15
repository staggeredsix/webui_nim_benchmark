from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketState
from pathlib import Path
import asyncio
import queue

from .api.routes import api_router
from .utils.metrics import collect_metrics, metrics_collector
from .utils.connection import ConnectionManager
from .utils.logger import logger
from .services.benchmark_progress import ProgressTracker
from .services.container import container_manager

progress_tracker = ProgressTracker()

app = FastAPI(strict_slashes=False)
connection_manager = ConnectionManager()

# Mount API router
app.include_router(api_router, prefix="/api")
app.mount("/assets", StaticFiles(directory="frontend_dist/assets"), name="assets")

# CORS configuration
origins = [
    "http://localhost:7000",
    "http://127.0.0.1:7000",
    "http://192.168.50.210:7000"  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.middleware("http")
async def add_logging(request: Request, call_next):
    response = await call_next(request)
    print(f"Response Headers: {response.headers}")
    return response


@app.websocket("/ws/metrics")
async def metrics_websocket(websocket: WebSocket):
    await connection_manager.connect(websocket)
    try:
        # Start the metrics collector if not already running
        if not metrics_collector.collector_thread or not metrics_collector.collector_thread.is_alive():
            metrics_collector.start_collector()
            
        while True:
            try:
                # Get metrics from the queue (non-blocking)
                try:
                    # Wait for up to 1 second for new metrics
                    metrics = metrics_collector.metrics_queue.get(timeout=1)
                except queue.Empty:
                    # If no new metrics, collect them now
                    metrics = metrics_collector.collect_metrics()
                    
                # Add peak metrics
                peaks = metrics_collector.get_peaks()
                metrics.update(peaks)
                
                await websocket.send_json({
                    "type": "metrics_update",
                    "metrics": metrics
                })
                
                await asyncio.sleep(0.25)  # Throttle updates to 4 per second
                
            except Exception as e:
                logger.error(f"Error in metrics websocket: {e}")
                await asyncio.sleep(1)  # Wait before retrying on error
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await connection_manager.disconnect(websocket)

# WebSocket endpoint for benchmark progress
@app.websocket("/ws/benchmark")
async def benchmark_progress_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if websocket.client_state == WebSocketState.DISCONNECTED:
                logger.info("Benchmark WebSocket client disconnected")
                break

            if progress_tracker.progress:
                for run_id, progress in progress_tracker.progress.items():
                    await websocket.send_json({
                        "type": "benchmark_progress",
                        "progress": {
                            "completed": progress.completed,
                            "total": progress.total,
                            "currentTps": progress.current_tps,
                            "estimatedTimeRemaining": progress.estimated_time_remaining
                        }
                    })

            await asyncio.sleep(.25)

    except WebSocketDisconnect:
        logger.info("Benchmark WebSocket client disconnected gracefully")
    except Exception as e:
        logger.error(f"Benchmark WebSocket error: {e}")
    finally:
        try:
            if websocket.client_state != WebSocketState.DISCONNECTED:
                await websocket.close()
                logger.info("Benchmark WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error closing benchmark WebSocket: {e}")

# WebSocket endpoint for container logs
@app.websocket("/ws/logs/{container_id}")
async def container_logs_ws(websocket: WebSocket, container_id: str):
    await websocket.accept()
    try:
        container = container_manager.client.containers.get(container_id)
        for line in container.logs(stream=True, follow=True, timestamps=True):
            if websocket.client_state == WebSocketState.DISCONNECTED:
                break
            log_line = line.decode('utf-8').strip()
            await websocket.send_json({"log": log_line})
    except Exception as e:
        logger.error(f"Container log streaming error: {e}")
    finally:
        await websocket.close()

# Serve SPA (Single Page Application)
@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("ws/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    spa_path = Path("frontend_dist/index.html")
    if not spa_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return FileResponse(spa_path)

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=7000, reload=True)
