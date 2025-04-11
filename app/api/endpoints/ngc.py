# File: app/api/endpoints/ngc.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.ngc_key_helper import save_key, retrieve_key, delete_key, key_exists
from ...config import settings

router = APIRouter()

class NGCKeyRequest(BaseModel):
    key: str

@router.post("")  # Empty string because the prefix /ngc-key is added in routes.py
async def set_ngc_key(request: NGCKeyRequest):
    try:
        save_key(request.key)
        settings.NGC_API_KEY = request.key
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_ngc_key():
    if not key_exists():
        raise HTTPException(status_code=404, detail="Key not found")
    return {"exists": True}

@router.delete("")
async def delete_ngc_key():
    try:
        delete_key()
        settings.NGC_API_KEY = None
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
