# File: app/api/endpoints/nim.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any
from pydantic import BaseModel
from app.services.container import ContainerManager
from app.utils.logger import logger
from app.utils.ngc_key_helper import key_exists

router = APIRouter()
container_manager = ContainerManager()

class NimPullRequest(BaseModel):
    image_name: str

@router.post("/pull", tags=["nim"])
async def pull_nim(request: NimPullRequest):
    if not key_exists():
        raise HTTPException(status_code=400, detail="NGC API key not set")
    try:
        result = await container_manager.start_container(request.image_name)
        return result
    except Exception as e:
        logger.error(f"Failed to pull NIM: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop", tags=["nim"])
async def stop_nim():
    try:
        container_manager.stop_container()
        return {"status": "stopped"}
    except Exception as e:
        logger.error(f"Failed to stop NIM: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", tags=["nim"])
async def list_nims():
    try:
        containers = container_manager.list_containers()
        return containers if containers is not None else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        return []

@router.get("/", tags=["nim"])
async def list_root_nims():
    logger.info("Root List NIMs endpoint hit")
    try:
        containers = container_manager.list_containers()
        logger.info(f"Found containers at root: {containers}")
        return containers
    except Exception as e:
        logger.error(f"Error listing containers at root: {e}")
        raise HTTPException(status_code=500, detail=str(e))

