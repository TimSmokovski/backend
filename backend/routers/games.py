import random
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH
from auth import get_current_user

router = APIRouter(tags=["games"])

ROULETTE_SECTIONS = [
    {"name": "2x",   "mult": 2.0},
    {"name": "1.5x", "mult": 1.5},
    {"name": "3x",   "mult": 3.0},
    {"name": "5x",   "mult": 5.0},
    {"name": "1.2x", "mult": 1.2},
    {"name": "10x",  "mult": 10.0},
    {"name": "0x",   "mult": 0.0},
]
ROULETTE_WEIGHTS = [30, 25, 15, 10, 12, 3, 5]

SLOT_EMOJIS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "🃏", "7️⃣"]
SLOT_MULT   = {"💎": 50, "7️⃣": 20, "⭐": 15, "🍇": 10, "🍒": 8, "🍊": 6, "🍋": 5, "🃏": 4}

EGG_PRIZES = {
    "common":    [{"emoji":"🦊","name":"Лиса","stars":800},{"emoji":"🌊","name":"Волна","stars":600},{"emoji":"⚡","name":"Молния","stars":950}],
    "rare":      [{"emoji":"👾","name":"Пришелец","stars":2814},{"emoji":"🌿","name":"Листок","stars":2404},{"emoji":"🧪","name":"Зелье","stars":1361}],
    "legendary": [{"emoji":"🐉","name":"Дракон","stars":9999},{"emoji":"💎","name":"Алмаз","stars":7500},{"emoji":"🧞","name":"Джинн","stars":5009}],
}
EGG_COSTS = {"common": 50, "rare": 150, "legendary": 500}


async def deduct_and_add(user_id, deduct, add):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET balance = balance - ? + ? WHERE id = ?", (deduct, add, user_id))
        await db.commit()
        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
        row = await cur.fetchone()
    return row[0]


@router.post("/roulette/spin")
async def roulette_spin(body: dict, user: dict = Depends(get_current_user)):
    bet = int(body.get("bet", 100))
    if user["balance"] < bet:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")
    section = random.choices(ROULETTE_SECTIONS, weights=ROULETTE_WEIGHTS, k=1)[0]
    won = int(bet * section["mult"])
    new_balance = await deduct_and_add(user["id"], bet, won)
    return {"section": section, "bet": bet, "won": won, "new_balance": new_balance}


@router.post("/slots/spin")
async def slots_spin(body: dict, user: dict = Depends(get_current_user)):
    bet = int(body.get("bet", 50))
    if user["balance"] < bet:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")
    reels = [random.choice(SLOT_EMOJIS) for _ in range(3)]
    if reels[0] == reels[1] == reels[2]:
        won, result = bet * SLOT_MULT.get(reels[0], 4), "jackpot"
    elif reels[0] == reels[1] or reels[1] == reels[2]:
        won, result = bet * 2, "pair"
    else:
        won, result = 0, "lose"
    new_balance = await deduct_and_add(user["id"], bet, won)
    return {"reels": reels, "result": result, "won": won, "new_balance": new_balance}


@router.post("/eggs/open")
async def open_egg(body: dict, user: dict = Depends(get_current_user)):
    egg_type = body.get("egg_type", "common")
    cost = EGG_COSTS.get(egg_type, 50)
    if user["balance"] < cost:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")
    item = random.choice(EGG_PRIZES.get(egg_type, EGG_PRIZES["common"]))
    new_balance = await deduct_and_add(user["id"], cost, item["stars"])
    return {"item": item, "new_balance": new_balance}


@router.post("/upgrade")
async def upgrade_item(body: dict, user: dict = Depends(get_current_user)):
    from_stars = int(body.get("from_stars", 500))
    to_stars   = int(body.get("to_stars", 2000))
    if user["balance"] < from_stars:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")
    chance = max(5, min(90, int((from_stars / to_stars) * 100)))
    success = random.random() * 100 < chance
    won = to_stars if success else 0
    new_balance = await deduct_and_add(user["id"], from_stars, won)
    return {"success": success, "chance": chance, "new_balance": new_balance}
