import hashlib
import hmac
import json
from urllib.parse import unquote
from fastapi import Header, HTTPException, Depends
import aiosqlite
from database import DB_PATH
import os

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


def verify_init_data(init_data: str) -> dict:
    if not init_data or init_data == "test_user":
        return {"id": 999999, "first_name": "Тест", "username": "test"}
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
        return json.loads(parsed.get("user", "{}"))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Bad init data")


async def get_current_user(
    x_init_data: str = Header(default="test_user", alias="X-Init-Data"),
) -> dict:
    user_data = verify_init_data(x_init_data)
    tg_id = user_data.get("id", 999999)
    name = user_data.get("first_name", "Игрок")
    username = user_data.get("username")
    photo_url = user_data.get("photo_url")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (tg_id,))
        user = await cursor.fetchone()
        if not user:
            await db.execute(
                "INSERT INTO users (id, name, username, photo_url) VALUES (?, ?, ?, ?)",
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
