# File: app/api/endpoints/huggingface.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.huggingface_key_helper import save_key, retrieve_key, delete_key, key_exists

router = APIRouter()

class HFKeyRequest(BaseModel):
    key: str

@router.post("")
async def set_hf_key(request: HFKeyRequest):
    try:
        save_key(request.key)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_hf_key():
    if not key_exists():
        raise HTTPException(status_code=404, detail="Key not found")
    return {"exists": True}

@router.delete("")
async def delete_hf_key():
    try:
        delete_key()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
