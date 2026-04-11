import hashlib
import hmac
import json
import time
from urllib.parse import unquote
from fastapi import Header, HTTPException, Depends
import aiosqlite
from database import DB_PATH
import os

AUTH_DATE_TTL = 86400  # init_data действителен 24 часа

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


def verify_init_data(init_data: str) -> dict:
    if not init_data:
        raise HTTPException(status_code=403, detail="Требуется авторизация Telegram")
    try:
        parsed = {}
        for part in init_data.split("&"):
            k, v = part.split("=", 1)
            parsed[k] = unquote(v)
        data_check = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items()) if k != "hash"
        )
        secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        expected = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
        if expected != parsed.get("hash"):
            raise HTTPException(status_code=403, detail="Invalid init data")
        auth_date = int(parsed.get("auth_date", 0))
        if auth_date and time.time() - auth_date > AUTH_DATE_TTL:
            raise HTTPException(status_code=403, detail="Сессия устарела — перезапусти приложение")
        return json.loads(parsed.get("user", "{}"))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Bad init data")


DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"


async def get_current_user(
    x_init_data: str = Header(default="", alias="X-Init-Data"),
) -> dict:
    if DEV_MODE and not x_init_data:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            await db.execute(
                "INSERT OR IGNORE INTO users (id, name, username, photo_url, balance) VALUES (1, 'TestUser', 'testuser', NULL, 10000)"
            )
            # Если баланс меньше 10к — пополняем до 10к
            await db.execute("UPDATE users SET balance = 10000 WHERE id = 1 AND balance < 10000")
            await db.commit()
            cur = await db.execute("SELECT * FROM users WHERE id = 1")
            user = await cur.fetchone()
        return dict(user)
    user_data = verify_init_data(x_init_data)
    tg_id = user_data.get("id")
    if not tg_id:
        raise HTTPException(status_code=403, detail="Требуется авторизация Telegram")
    name = user_data.get("first_name", "Игрок")
    username = user_data.get("username")
    photo_url = user_data.get("photo_url")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (tg_id,))
        user = await cursor.fetchone()
        if not user:
            await db.execute(
                "INSERT INTO users (id, name, username, photo_url, balance) VALUES (?, ?, ?, ?, 0)",
                (tg_id, name, username, photo_url),
            )
            await db.commit()
        else:
            await db.execute(
                "UPDATE users SET name = ?, username = ?, photo_url = COALESCE(?, photo_url) WHERE id = ?",
                (name, username, photo_url, tg_id),
            )
            await db.commit()
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (tg_id,))
        user = await cursor.fetchone()
        user_dict = dict(user)
        if user_dict.get("banned"):
            raise HTTPException(status_code=403, detail="Ваш аккаунт заблокирован")
        return user_dict
