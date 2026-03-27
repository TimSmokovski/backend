from fastapi import APIRouter, Depends
import aiosqlite
from database import DB_PATH
from auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "balance": user["balance"],
        "photo_url": user["photo_url"],
        "avatar": (user["name"] or "И")[0].upper(),
    }
