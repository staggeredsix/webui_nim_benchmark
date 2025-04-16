# app/api/endpoints/api_keys.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.api_keys import api_key_manager

router = APIRouter()

class ApiKeyRequest(BaseModel):
    key: str

class ApiKeyResponse(BaseModel):
    status: str
    key_type: str

@router.post("/{key_type}")
async def set_api_key(key_type: str, request: ApiKeyRequest):
    try:
        if key_type not in ['ngc', 'huggingface']:
            raise HTTPException(status_code=400, detail=f"Unsupported key type: {key_type}")
            
        success = api_key_manager.save_key(key_type, request.key)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to save {key_type} API key")
            
        return ApiKeyResponse(status="success", key_type=key_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{key_type}")
async def check_api_key(key_type: str):
    if key_type not in ['ngc', 'huggingface']:
        raise HTTPException(status_code=400, detail=f"Unsupported key type: {key_type}")
        
    if not api_key_manager.key_exists(key_type):
        return {"exists": False, "key_type": key_type}
    
    return {"exists": True, "key_type": key_type}

@router.delete("/{key_type}")
async def delete_api_key(key_type: str):
    try:
        if key_type not in ['ngc', 'huggingface']:
            raise HTTPException(status_code=400, detail=f"Unsupported key type: {key_type}")
            
        success = api_key_manager.delete_key(key_type)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to delete {key_type} API key")
            
        return ApiKeyResponse(status="deleted", key_type=key_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_all_key_status():
    """Get the status of all API keys."""
    try:
        status = api_key_manager.get_key_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
