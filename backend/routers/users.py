from fastapi import APIRouter, Depends
import aiosqlite
from database import DB_PATH
from auth import get_current_user
from routers import games as _games

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "balance": user["balance"],
        "demo_balance": user.get("demo_balance") or 0,
        "photo_url": user["photo_url"],
        "avatar": (user["name"] or "И")[0].upper(),
        "global_win_chance": _games.GLOBAL_WIN_CHANCE,
    }
