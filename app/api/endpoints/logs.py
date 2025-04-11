# app/api/endpoints/logs.py
from fastapi import APIRouter, HTTPException, WebSocket
from pydantic import BaseModel
from typing import Optional
import docker
from app.utils.logger import logger

router = APIRouter()
client = docker.from_env()

class LogSaveRequest(BaseModel):
    container_id: str
    filename: str

@router.websocket("/ws/logs/{container_id}")
async def websocket_endpoint(websocket: WebSocket, container_id: str):
    await websocket.accept()
    try:
        container = client.containers.get(container_id)
        for line in container.logs(stream=True, follow=True):
            log_line = line.decode('utf-8').strip()
            await websocket.send_json({"log": log_line})
    except docker.errors.NotFound:
        await websocket.send_json({"error": "Container not found"})
        await websocket.close()
    except Exception as e:
        logger.error(f"Log streaming error: {e}")
        await websocket.send_json({"error": str(e)})
        await websocket.close()

@router.post("/save")
async def save_logs(request: LogSaveRequest):
    try:
        container = client.containers.get(request.container_id)
        logs = container.logs().decode('utf-8')
        with open(f"{request.filename}.log", "w") as f:
            f.write(logs)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error saving logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))