import random
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from datetime import datetime, timedelta
from database import DB_PATH
from auth import get_current_user
from routers import games as _games

router = APIRouter(prefix="/cases", tags=["cases"])

FREE_ITEMS = [
    {"stars": 0,   "label": "Ничего", "rarity": "common",   "weight": 200},
    {"stars": 5,   "label": "⭐ 5",   "rarity": "common",   "weight": 300},
    {"stars": 10,  "label": "⭐ 10",  "rarity": "common",   "weight": 200},
    {"stars": 15,  "label": "⭐ 15",  "rarity": "common",   "weight": 100},
    {"stars": 20,  "label": "⭐ 20",  "rarity": "common",   "weight": 80},
    {"stars": 30,  "label": "⭐ 30",  "rarity": "uncommon", "weight": 50},
    {"stars": 40,  "label": "⭐ 40",  "rarity": "uncommon", "weight": 30},
    {"stars": 50,  "label": "⭐ 50",  "rarity": "uncommon", "weight": 20},
    {"stars": 75,  "label": "⭐ 75",  "rarity": "rare",     "weight": 10},
    {"stars": 90,  "label": "⭐ 90",  "rarity": "rare",     "weight": 5},
    {"stars": 100, "label": "⭐ 100", "rarity": "epic",     "weight": 5},
]



@router.post("/open")
async def open_case(body: dict, user: dict = Depends(get_current_user)):
    if body.get("type", "free") != "free":
        raise HTTPException(status_code=400, detail="Неверный тип кейса")

    async with aiosqlite.connect(DB_PATH) as db:
        free_at = user.get("free_case_at")
        if free_at:
            last = datetime.fromisoformat(free_at)
            if datetime.utcnow() - last < timedelta(hours=24):
                next_at = last + timedelta(hours=24)
                hours_left = int((next_at - datetime.utcnow()).seconds / 3600)
                raise HTTPException(status_code=429, detail=f"Следующий кейс через {hours_left} ч.")
        luck = body.get("luck", -1)
        admin_override = isinstance(luck, (int, float)) and 0 <= luck <= 100 and _games._is_admin(user)
        if admin_override:
            chance = int(luck)
        else:
            chance = _games._get_effective_chance(user["id"])
        if chance >= 100:
            item = FREE_ITEMS[-1]
        elif chance <= 0:
            item = FREE_ITEMS[0]
        else:
            win_items  = [i for i in FREE_ITEMS if i["stars"] > 0]
            lose_items = [i for i in FREE_ITEMS if i["stars"] == 0]
            all_items   = win_items + lose_items
            all_weights = [i["weight"] * chance for i in win_items] + [i["weight"] * (100 - chance) for i in lose_items]
            item = random.choices(all_items, weights=all_weights, k=1)[0]
        if not admin_override:
            _games._update_rtp_penalty(user["id"], item["stars"] > 0)
        await db.execute(
            "UPDATE users SET balance = balance + ?, free_case_at = ? WHERE id = ?",
            (item["stars"], datetime.utcnow().isoformat(), user["id"]),
        )
        # Сохраняем в историю если 100+ звёзд
        if item["stars"] >= 100:
            emoji = item.get("emoji", "⭐")
            name = item.get("name", item.get("label", f"⭐ {item['stars']}"))
            await db.execute(
                "INSERT INTO case_wins (user_id, emoji, name, stars) VALUES (?, ?, ?, ?)",
                (user["id"], emoji, name, item["stars"])
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
