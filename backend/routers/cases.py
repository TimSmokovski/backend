import random
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from datetime import datetime, timedelta
from database import DB_PATH
from auth import get_current_user

router = APIRouter(prefix="/cases", tags=["cases"])

ITEMS = [
    {"emoji": "🎒", "name": "Рюкзак",   "stars": 500,  "rarity": "common",    "weight": 30},
    {"emoji": "🦊", "name": "Лиса",     "stars": 800,  "rarity": "common",    "weight": 25},
    {"emoji": "🌊", "name": "Волна",    "stars": 600,  "rarity": "common",    "weight": 20},
    {"emoji": "⚡", "name": "Молния",   "stars": 950,  "rarity": "uncommon",  "weight": 12},
    {"emoji": "🎃", "name": "Тыква",    "stars": 1257, "rarity": "uncommon",  "weight": 8},
    {"emoji": "🧪", "name": "Зелье",   "stars": 1361, "rarity": "rare",      "weight": 2},
    {"emoji": "🌿", "name": "Листок",   "stars": 2404, "rarity": "rare",      "weight": 2},
    {"emoji": "👾", "name": "Пришелец", "stars": 2814, "rarity": "rare",      "weight": 1},
    {"emoji": "🐻", "name": "Мишка",    "stars": 4653, "rarity": "epic",      "weight": 0.5},
    {"emoji": "🧞", "name": "Джинн",    "stars": 5009, "rarity": "epic",      "weight": 0.3},
    {"emoji": "💎", "name": "Алмаз",    "stars": 7500, "rarity": "legendary", "weight": 0.15},
    {"emoji": "🐉", "name": "Дракон",   "stars": 9999, "rarity": "legendary", "weight": 0.05},
]
FREE_ITEMS = [
    {"emoji": "⭐", "name": "Звезда",   "stars": 1,   "rarity": "common",   "weight": 196},
    {"emoji": "🌊", "name": "Волна",    "stars": 2,   "rarity": "common",   "weight": 195},
    {"emoji": "🍀", "name": "Клевер",   "stars": 4,   "rarity": "common",   "weight": 194},
    {"emoji": "🎈", "name": "Шарик",    "stars": 5,   "rarity": "common",   "weight": 194},
    {"emoji": "⚡", "name": "Молния",   "stars": 10,  "rarity": "uncommon", "weight": 150},
    {"emoji": "🎃", "name": "Тыква",    "stars": 20,  "rarity": "uncommon", "weight": 50},
    {"emoji": "🦊", "name": "Лиса",     "stars": 50,  "rarity": "rare",     "weight": 20},
    {"emoji": "🎒", "name": "Рюкзак",   "stars": 100, "rarity": "epic",     "weight": 1},
]


def weighted_choice(items):
    weights = [i["weight"] for i in items]
    return random.choices(items, weights=weights, k=1)[0]


@router.post("/open")
async def open_case(body: dict, user: dict = Depends(get_current_user)):
    case_type = body.get("type", "free")

    async with aiosqlite.connect(DB_PATH) as db:
        if case_type == "free":
            free_at = user.get("free_case_at")
            if free_at:
                last = datetime.fromisoformat(free_at)
                if datetime.utcnow() - last < timedelta(hours=24):
                    next_at = last + timedelta(hours=24)
                    hours_left = int((next_at - datetime.utcnow()).seconds / 3600)
                    raise HTTPException(status_code=429, detail=f"Следующий кейс через {hours_left} ч.")
            item = weighted_choice(FREE_ITEMS)
            await db.execute(
                "UPDATE users SET balance = balance + ?, free_case_at = ? WHERE id = ?",
                (item["stars"], datetime.utcnow().isoformat(), user["id"]),
            )
        else:
            cost = int(body.get("cost", 100))
            if user["balance"] < cost:
                raise HTTPException(status_code=400, detail="Недостаточно звёзд")
            item = weighted_choice(ITEMS)
            await db.execute(
                "UPDATE users SET balance = balance - ? + ? WHERE id = ?",
                (cost, item["stars"], user["id"]),
            )
        # Сохраняем в историю если 100+ звёзд
        if item["stars"] >= 100:
            await db.execute(
                "INSERT INTO case_wins (user_id, emoji, name, stars) VALUES (?, ?, ?, ?)",
                (user["id"], item["emoji"], item["name"], item["stars"])
            )
        await db.commit()
        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()

    return {"item": item, "new_balance": row[0]}


@router.post("/record_win")
async def record_win(body: dict, user: dict = Depends(get_current_user)):
    emoji = body.get("emoji", "🎁")
    name = body.get("name", "Приз")
    stars = int(body.get("stars", 0))
    if stars < 100:
        return {"ok": True}
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute(
                "INSERT INTO case_wins (user_id, emoji, name, stars) VALUES (?, ?, ?, ?)",
                (user["id"], emoji, name, stars)
            )
            await db.commit()
        except Exception:
            pass
    return {"ok": True}


@router.get("/recent")
async def recent_wins():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        try:
            cur = await db.execute(
                """SELECT w.emoji, w.stars, u.name
                   FROM case_wins w LEFT JOIN users u ON u.id = w.user_id
                   ORDER BY w.id DESC LIMIT 30"""
            )
            rows = await cur.fetchall()
        except Exception:
            return []
    return [{"emoji": r["emoji"], "stars": r["stars"], "name": r["name"] or "Игрок"} for r in rows]
