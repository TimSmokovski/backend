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
                "SELECT id, name, username, balance, banned, COALESCE(demo_balance,0) as demo_balance FROM users "
                "WHERE username LIKE ? OR name LIKE ? OR id = ? "
                "ORDER BY id DESC LIMIT 20",
                (f"%{q}%", f"%{q}%", uid),
            )
        else:
            cur = await db.execute(
                "SELECT id, name, username, balance, banned, COALESCE(demo_balance,0) as demo_balance FROM users "
                "ORDER BY id DESC LIMIT 50"
            )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/users/{user_id}/balance")
async def adjust_balance(user_id: int, body: dict, _admin: dict = Depends(require_admin)):
    amount = int(body.get("amount", 0))
    action = body.get("action", "add")  # "add" | "set"
    async with aiosqlite.connect(DB_PATH) as db:
        if action == "set":
            # Установка баланса — не меняет demo_balance
            await db.execute("UPDATE users SET balance = ? WHERE id = ?", (max(0, amount), user_id))
        else:
            # Добавление: если amount > 0 — это демо-звёзды (выдача админом)
            await db.execute(
                "UPDATE users SET balance = MAX(0, balance + ?) WHERE id = ?",
                (amount, user_id),
            )
            if amount > 0:
                await db.execute(
                    "UPDATE users SET demo_balance = COALESCE(demo_balance,0) + ? WHERE id = ?",
                    (amount, user_id),
                )
            elif amount < 0:
                # При изъятии — уменьшаем demo_balance (не ниже 0)
                await db.execute(
                    "UPDATE users SET demo_balance = MAX(0, COALESCE(demo_balance,0) + ?) WHERE id = ?",
                    (amount, user_id),
                )
        await db.commit()
        cur = await db.execute(
            "SELECT id, name, username, balance, COALESCE(demo_balance,0) FROM users WHERE id = ?",
            (user_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Пользователь не найден")
    return {"ok": True, "user": {
        "id": row[0], "name": row[1], "username": row[2],
        "balance": row[3], "demo_balance": row[4],
    }}


@router.post("/users/{user_id}/reset_cooldown")
async def reset_cooldown(user_id: int, _admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET free_case_at = NULL WHERE id = ?", (user_id,))
        await db.commit()
    return {"ok": True}


@router.post("/ban")
async def ban_user(body: dict, admin: dict = Depends(require_admin)):
    username = (body.get("username") or "").strip().lstrip("@")
    if not username:
        raise HTTPException(400, "Укажите username")
    admin_username = (admin.get("username") or "").lstrip("@")
    if username.lower() == admin_username.lower():
        raise HTTPException(400, "Нельзя заблокировать самого себя")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT id, username FROM users WHERE username = ? COLLATE NOCASE", (username,)
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "Пользователь не найден")
        await db.execute(
            "UPDATE users SET banned = 1 WHERE username = ? COLLATE NOCASE", (username,)
        )
        await db.commit()
    return {"ok": True, "banned": username}


@router.post("/unban")
async def unban_user(body: dict, _admin: dict = Depends(require_admin)):
    username = (body.get("username") or "").strip().lstrip("@")
    if not username:
        raise HTTPException(400, "Укажите username")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET banned = 0 WHERE username = ? COLLATE NOCASE", (username,)
        )
        await db.commit()
    return {"ok": True, "unbanned": username}


@router.get("/settings")
async def get_settings(_admin: dict = Depends(require_admin)):
    from routers.games import GLOBAL_WIN_CHANCE
    return {"global_win_chance": GLOBAL_WIN_CHANCE}


@router.post("/settings/chance")
async def set_global_chance(body: dict, _admin: dict = Depends(require_admin)):
    from routers import games
    chance = max(0, min(100, int(body.get("chance", 50))))
    games.GLOBAL_WIN_CHANCE = chance
    await set_setting("global_win_chance", chance)
    return {"ok": True, "chance": chance}


@router.get("/channel-task")
async def get_channel_task(_admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT url FROM tasks WHERE type = 'channel_sub' LIMIT 1")
        row = await cur.fetchone()
    if not row:
        return {"username": ""}
    url = row["url"] or ""
    username = url.rstrip("/").split("/")[-1]
    return {"username": username}


@router.post("/channel-task")
async def set_channel_task(body: dict, _admin: dict = Depends(require_admin)):
    username = (body.get("username") or "").strip().lstrip("@")
    url = f"https://t.me/{username}" if username else ""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE tasks SET url = ? WHERE type = 'channel_sub'", (url,))
        await db.commit()
    return {"ok": True}


SUPERADMIN_ID = 5399684154

@router.post("/reset-balances")
async def reset_all_balances(admin: dict = Depends(require_admin)):
    if admin.get("id") != SUPERADMIN_ID:
        raise HTTPException(status_code=403, detail="Нет доступа")
    """Обнуляет баланс и demo_balance всем пользователям. Только для подготовки к запуску."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET balance = 0, demo_balance = 0")
        await db.execute("DELETE FROM user_tasks")
        await db.execute("DELETE FROM case_wins")
        await db.execute("DELETE FROM pvp_bets")
        await db.execute("DELETE FROM pvp_rounds")
        await db.execute("DELETE FROM crash_bets")
        await db.execute("DELETE FROM withdrawals")
        await db.commit()
    return {"ok": True, "message": "Все балансы обнулены, история очищена"}
