import random
import math
import asyncio
import os
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH, get_setting
from auth import get_current_user

_ADMIN_IDS = set(
    int(i.strip()) for i in os.getenv("ADMIN_IDS", "").split(",")
    if i.strip().lstrip("-").isdigit()
)
_ADMIN_USERNAMES = set(
    u.strip().lstrip("@")
    for u in os.getenv("ADMIN_USERNAMES", "").split(",")
    if u.strip()
)


def _is_admin(user: dict) -> bool:
    return user["id"] in _ADMIN_IDS or (user.get("username") or "").lstrip("@") in _ADMIN_USERNAMES

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
GLOBAL_WIN_CHANCE = 50  # 0–100, загружается из БД

SLOT_EMOJIS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "🃏", "7️⃣"]
SLOT_MULT   = {"💎": 50, "7️⃣": 20, "⭐": 15, "🍇": 10, "🍒": 8, "🍊": 6, "🍋": 5, "🃏": 4}


def _chance_weights(chance: int):
    """Возвращает секции и веса на основе chance 0–100."""
    win_pairs  = [(s, ROULETTE_WEIGHTS[i]) for i, s in enumerate(ROULETTE_SECTIONS) if s["mult"] > 0]
    lose_pairs = [(s, ROULETTE_WEIGHTS[i]) for i, s in enumerate(ROULETTE_SECTIONS) if s["mult"] == 0]
    secs = [s for s, _ in win_pairs] + [s for s, _ in lose_pairs]
    w    = [wt * chance for _, wt in win_pairs] + [wt * (100 - chance) for _, wt in lose_pairs]
    if sum(w) == 0:
        w = [1] * len(w)
    return secs, w


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
    if bet < 10:
        raise HTTPException(status_code=400, detail="Минимальная ставка — 10 звёзд")
    if user["balance"] < bet:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")
    luck = body.get("luck", -1)
    if isinstance(luck, (int, float)) and 0 <= luck <= 100 and _is_admin(user):
        chance = int(luck)  # личная удача админа — перекрывает глобальные шансы
    else:
        chance = GLOBAL_WIN_CHANCE
    secs, w = _chance_weights(chance)
    section = random.choices(secs, weights=w, k=1)[0]
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




# ===== CRASH GAME =====

_crash = {
    "phase": "waiting",   # waiting | flying | crashed
    "time_left": 10,
    "multiplier": 1.0,
    "crash_point": 2.0,
    "players": {},        # str(uid) -> {name, bet, cashed_out, cashout_mult}
    "round_id": 0,
}


def _gen_crash():
    """Генерирует точку краша с учётом GLOBAL_WIN_CHANCE (0–100)."""
    c = GLOBAL_WIN_CHANCE  # 0 = всегда краш, 100 = всегда высоко
    if c == 100:
        return round(random.uniform(20.0, 100.0), 2)
    if c == 0:
        return round(random.uniform(1.01, 1.05), 2)
    # Чем выше chance, тем ниже вероятность раннего краша
    early_prob = 0.18 * (1 - c / 100)
    r = random.random()
    if r < early_prob * 0.44:
        return round(random.uniform(1.01, 1.05), 2)
    if r < early_prob:
        return round(random.uniform(1.05, 1.25), 2)
    lam = max(0.3, 3.5 * (1 - c / 100) + 0.3)
    val = 1.10 + random.expovariate(lam)
    val += random.uniform(-0.03, 0.03)
    return max(1.10, round(val, 2))


async def crash_loop():
    global GLOBAL_WIN_CHANCE
    # Загружаем веса рулетки из БД при старте
    saved_weights = await get_setting("roulette_weights")
    if saved_weights and len(saved_weights) == len(ROULETTE_WEIGHTS):
        for i, w in enumerate(saved_weights):
            ROULETTE_WEIGHTS[i] = w
    # Загружаем глобальные шансы
    saved_chance = await get_setting("global_win_chance")
    if saved_chance is not None:
        GLOBAL_WIN_CHANCE = int(saved_chance)

    while True:
        _crash.update({
            "phase": "waiting",
            "multiplier": 1.0,
            "crash_point": _gen_crash(),
            "time_left": 10,
            "players": {},
            "extended": False,
        })
        for i in range(10, 0, -1):
            _crash["time_left"] = i
            await asyncio.sleep(1)

        if not _crash["players"]:
            await asyncio.sleep(0.5)
            continue

        _crash["phase"] = "flying"
        _crash["time_left"] = 0
        loop = asyncio.get_running_loop()
        t0 = loop.time()

        while True:
            elapsed = loop.time() - t0
            mult = round(math.exp(0.10 * elapsed), 2)
            _crash["multiplier"] = mult

            # If all players cashed out — extend flight 2x to attract new bets
            if not _crash["extended"] and _crash["players"]:
                all_out = all(v["cashed_out"] for v in _crash["players"].values())
                if all_out:
                    _crash["crash_point"] = round(mult * random.uniform(1.2, 4.0), 2)
                    _crash["extended"] = True

            if mult >= _crash["crash_point"]:
                _crash["multiplier"] = _crash["crash_point"]
                break
            await asyncio.sleep(0.07)

        _crash["phase"] = "crashed"
        # Помечаем незакрытые ставки этого раунда как проигрыш
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE crash_bets SET status = 'lost' WHERE round_id = ? AND status = 'active'",
                (_crash["round_id"],),
            )
            await db.commit()
        _crash["round_id"] += 1
        await asyncio.sleep(4)


@router.get("/crash/state")
async def crash_get_state():
    return {
        "phase": _crash["phase"],
        "time_left": _crash["time_left"],
        "multiplier": _crash["multiplier"],
        "crash_at": _crash["crash_point"] if _crash["phase"] == "crashed" else None,
        "players": [
            {
                "name": v["name"],
                "bet": v["bet"],
                "cashed_out": v["cashed_out"],
                "cashout_mult": v["cashout_mult"],
            }
            for v in _crash["players"].values()
        ],
        "round_id": _crash["round_id"],
    }


@router.post("/crash/bet")
async def crash_bet(body: dict, user: dict = Depends(get_current_user)):
    if _crash["phase"] != "waiting":
        raise HTTPException(400, "Набор закрыт — ждите следующего раунда")
    uid = str(user["id"])
    if uid in _crash["players"]:
        raise HTTPException(400, "Вы уже в этом раунде")
    bet = max(10, int(body.get("amount", 100)))
    if user["balance"] < bet:
        raise HTTPException(400, "Недостаточно звёзд")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (bet, user["id"]))
        await db.execute(
            "INSERT INTO crash_bets (user_id, amount, round_id) VALUES (?, ?, ?)",
            (user["id"], bet, _crash["round_id"]),
        )
        await db.commit()
        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()
    _crash["players"][uid] = {
        "name": user.get("name", "Игрок"),
        "bet": bet,
        "cashed_out": False,
        "cashout_mult": None,
    }
    return {"ok": True, "bet": bet, "new_balance": row[0]}


@router.post("/crash/cashout")
async def crash_cashout(user: dict = Depends(get_current_user)):
    if _crash["phase"] != "flying":
        raise HTTPException(400, "Ракета не летит")
    uid = str(user["id"])
    p = _crash["players"].get(uid)
    if not p:
        raise HTTPException(400, "Вы не участвуете в этом раунде")
    if p["cashed_out"]:
        raise HTTPException(400, "Вы уже вышли")
    mult = _crash["multiplier"]
    won = int(p["bet"] * mult)
    p["cashed_out"] = True
    p["cashout_mult"] = mult
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (won, user["id"]))
        await db.execute(
            "UPDATE crash_bets SET status = 'won', won_amount = ? "
            "WHERE user_id = ? AND round_id = ? AND status = 'active'",
            (won, user["id"], _crash["round_id"]),
        )
        await db.commit()
        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()
    return {"ok": True, "won": won, "multiplier": mult, "new_balance": row[0]}


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
