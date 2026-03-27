import os
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH, set_setting
from auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_IDS = set(
    int(i.strip()) for i in os.getenv("ADMIN_IDS", "").split(",")
    if i.strip().lstrip("-").isdigit()
)
# fallback: поддержка старого ADMIN_USERNAMES
ADMIN_USERNAMES = set(
    u.strip().lstrip("@")
    for u in os.getenv("ADMIN_USERNAMES", "").split(",")
    if u.strip()
)


def require_admin(user: dict = Depends(get_current_user)):
    uid = user.get("id")
    username = (user.get("username") or "").lstrip("@")
    if uid not in ADMIN_IDS and username not in ADMIN_USERNAMES:
        raise HTTPException(status_code=403, detail="Нет доступа")
    return user


@router.get("/check")
async def admin_check(user: dict = Depends(require_admin)):
    return {"ok": True, "user": user.get("username"), "user_id": user.get("id")}


@router.get("/users")
async def list_users(q: str = "", _admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if q:
            uid = int(q) if q.lstrip("-").isdigit() else -1
            cur = await db.execute(
                "SELECT id, name, username, balance, banned FROM users "
                "WHERE username LIKE ? OR name LIKE ? OR id = ? "
                "ORDER BY balance DESC LIMIT 20",
                (f"%{q}%", f"%{q}%", uid),
            )
        else:
            cur = await db.execute(
                "SELECT id, name, username, balance, banned FROM users "
                "ORDER BY balance DESC LIMIT 50"
            )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/users/{user_id}/balance")
async def adjust_balance(user_id: int, body: dict, _admin: dict = Depends(require_admin)):
    amount = int(body.get("amount", 0))
    action = body.get("action", "add")  # "add" | "set"
    async with aiosqlite.connect(DB_PATH) as db:
        if action == "set":
            await db.execute("UPDATE users SET balance = ? WHERE id = ?", (max(0, amount), user_id))
        else:
            await db.execute(
                "UPDATE users SET balance = MAX(0, balance + ?) WHERE id = ?",
                (amount, user_id),
            )
        await db.commit()
        cur = await db.execute("SELECT id, name, username, balance FROM users WHERE id = ?", (user_id,))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Пользователь не найден")
    return {"ok": True, "user": dict(row)}


@router.post("/users/{user_id}/reset_cooldown")
async def reset_cooldown(user_id: int, _admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET free_case_at = NULL WHERE id = ?", (user_id,))
        await db.commit()
    return {"ok": True}


@router.post("/ban")
async def ban_user(body: dict, _admin: dict = Depends(require_admin)):
    username = (body.get("username") or "").strip().lstrip("@")
    if not username:
        raise HTTPException(400, "Укажите username")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT id, username FROM users WHERE username = ?", (username,))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "Пользователь не найден")
        await db.execute("UPDATE users SET banned = 1 WHERE username = ?", (username,))
        await db.commit()
    return {"ok": True, "banned": username}


@router.post("/unban")
async def unban_user(body: dict, _admin: dict = Depends(require_admin)):
    username = (body.get("username") or "").strip().lstrip("@")
    if not username:
        raise HTTPException(400, "Укажите username")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET banned = 0 WHERE username = ?", (username,))
        await db.commit()
    return {"ok": True, "unbanned": username}


@router.get("/settings")
async def get_settings(_admin: dict = Depends(require_admin)):
    from routers.games import ROULETTE_SECTIONS, ROULETTE_WEIGHTS
    return {
        "roulette": [
            {"name": s["name"], "mult": s["mult"], "weight": ROULETTE_WEIGHTS[i]}
            for i, s in enumerate(ROULETTE_SECTIONS)
        ]
    }


@router.post("/settings/roulette")
async def set_roulette(body: dict, _admin: dict = Depends(require_admin)):
    from routers import games
    weights = body.get("weights", [])
    if len(weights) != len(games.ROULETTE_WEIGHTS):
        raise HTTPException(400, f"Нужно {len(games.ROULETTE_WEIGHTS)} весов")
    for i, w in enumerate(weights):
        games.ROULETTE_WEIGHTS[i] = max(0, int(w))
    await set_setting("roulette_weights", games.ROULETTE_WEIGHTS)
    return {"ok": True, "weights": games.ROULETTE_WEIGHTS}
