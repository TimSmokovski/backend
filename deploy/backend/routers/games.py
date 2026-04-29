import random
import math
import asyncio
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH, get_setting, taint_win_if_demo
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

# ===== MINER GAME STATE =====
# Храним состояние игр в памяти (для простоты)
_miner_games = {}  # game_id -> {user_id, bet, mines, found, mult, cells}
_miner_game_timestamps = {}  # game_id -> timestamp для очистки старых игр
MINER_CELLS = 12
MINER_HOUSE = 1.10  # накрутка вероятности мины (+10%)
MINER_CUT = 0.93    # выплата 93% от честного за каждый шаг
MINER_GAME_TTL = 3600  # Время жизни игры в секундах (1 час)

# ===== INDIVIDUAL RTP PENALTY =====
_user_rtp_penalty: dict = {}  # user_id → штраф в пунктах (0..MAX_RTP_PENALTY)
MAX_RTP_PENALTY = 20   # максимальное снижение шанса в пунктах
PENALTY_ON_WIN  = 8    # прибавляется после победы
PENALTY_ON_LOSS = 4    # убавляется после проигрыша


def _cleanup_old_miner_games():
    """Очищает старые игры сапёра для предотвращения утечки памяти."""
    import time
    now = time.time()
    expired = [gid for gid, ts in _miner_game_timestamps.items() if now - ts > MINER_GAME_TTL]
    for gid in expired:
        _miner_games.pop(gid, None)
        _miner_game_timestamps.pop(gid, None)


def _is_admin(user: dict) -> bool:
    return user["id"] in _ADMIN_IDS or (user.get("username") or "").lstrip("@") in _ADMIN_USERNAMES


def _get_effective_chance(user_id: int) -> int:
    """Персональный шанс победы с учётом накопленного штрафа после побед."""
    penalty = _user_rtp_penalty.get(user_id, 0)
    return max(5, GLOBAL_WIN_CHANCE - penalty)


def _update_rtp_penalty(user_id: int, won: bool) -> None:
    """Обновляет штраф RTP: растёт после побед, восстанавливается после проигрышей."""
    cur = _user_rtp_penalty.get(user_id, 0)
    if won:
        cur = min(MAX_RTP_PENALTY, cur + PENALTY_ON_WIN)
    else:
        cur = max(0, cur - PENALTY_ON_LOSS)
    if cur:
        _user_rtp_penalty[user_id] = cur
    else:
        _user_rtp_penalty.pop(user_id, None)

router = APIRouter(tags=["games"])

ROULETTE_SECTIONS = [
    {"name": "×1.1", "mult": 1.1},
    {"name": "×1.5", "mult": 1.5},
    {"name": "×2",   "mult": 2.0},
    {"name": "×3",   "mult": 3.0},
    {"name": "×5",   "mult": 5.0},
    {"name": "×7",   "mult": 7.0},
    {"name": "×10",  "mult": 10.0},
    {"name": "×0",   "mult": 0.0},
]
# Веса выигрышных секций (сумма = 78.4)
ROULETTE_WEIGHTS = [40, 20, 12, 5, 1, 0.3, 0.1, 78.4]
GLOBAL_WIN_CHANCE = 30  # 0–100, загружается из БД

SLOT_EMOJIS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "🃏", "7️⃣"]
SLOT_MULT   = {"💎": 50, "7️⃣": 20, "⭐": 15, "🍇": 10, "🍒": 8, "🍊": 6, "🍋": 5, "🃏": 4}


def _chance_weights(chance: int):
    """chance=30 → ровно 30% побед. Веса нормализуются отдельно для выигрышей и проигрышей."""
    win_pairs  = [(s, ROULETTE_WEIGHTS[i]) for i, s in enumerate(ROULETTE_SECTIONS) if s["mult"] > 0]
    lose_pairs = [(s, ROULETTE_WEIGHTS[i]) for i, s in enumerate(ROULETTE_SECTIONS) if s["mult"] == 0]
    sum_w = sum(wt for _, wt in win_pairs) or 1
    sum_l = sum(wt for _, wt in lose_pairs) or 1
    secs = [s for s, _ in win_pairs] + [s for s, _ in lose_pairs]
    w    = [wt / sum_w * chance     for _, wt in win_pairs] + \
           [wt / sum_l * (100 - chance) for _, wt in lose_pairs]
    if sum(w) == 0:
        w = [1] * len(w)
    return secs, w


async def deduct_and_add(user_id, deduct, add):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "UPDATE users SET balance = balance - ? + ? WHERE id = ? AND balance >= ?",
            (deduct, add, user_id, deduct),
        )
        if cur.rowcount == 0:
            raise HTTPException(400, "Недостаточно звёзд")
        await taint_win_if_demo(db, user_id, deduct, add)
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
    admin_override = isinstance(luck, (int, float)) and 0 <= luck <= 100 and _is_admin(user)
    if admin_override:
        chance = int(luck)  # личная удача админа — перекрывает глобальные шансы
    else:
        chance = _get_effective_chance(user["id"])
    secs, w = _chance_weights(chance)
    section = random.choices(secs, weights=w, k=1)[0]
    won = int(bet * section["mult"])
    if not admin_override:
        _update_rtp_penalty(user["id"], won > 0)
    new_balance = await deduct_and_add(user["id"], bet, won)
    return {"section": section, "bet": bet, "won": won, "new_balance": new_balance}


@router.post("/slots/spin")
async def slots_spin(body: dict, user: dict = Depends(get_current_user)):
    bet = int(body.get("bet", 50))
    if user["balance"] < bet:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")
    luck = body.get("luck", -1)
    admin_override = isinstance(luck, (int, float)) and 0 <= luck <= 100 and _is_admin(user)
    if admin_override:
        chance = int(luck)
    else:
        chance = _get_effective_chance(user["id"])

    if chance >= 100:
        best = max(SLOT_EMOJIS, key=lambda e: SLOT_MULT.get(e, 1))
        reels = [best, best, best]
        won, result = bet * SLOT_MULT[best], "jackpot"
    elif chance <= 0:
        reels = random.sample(SLOT_EMOJIS, 3)
        while len(set(reels)) < 3:
            reels = random.sample(SLOT_EMOJIS, 3)
        won, result = 0, "lose"
    else:
        r = random.random() * 100
        if r < chance:
            if random.random() < 0.08:  # фиксированные 8% побед → джекпот; было chance/100 (=9% при chance=30)
                symbol = random.choice(SLOT_EMOJIS)
                reels = [symbol, symbol, symbol]
                won, result = bet * SLOT_MULT.get(symbol, 4), "jackpot"
            else:
                symbol = random.choice(SLOT_EMOJIS)
                other = random.choice([e for e in SLOT_EMOJIS if e != symbol])
                reels = [symbol, symbol, symbol]
                reels[random.randint(0, 2)] = other
                won, result = bet * 2, "pair"
        else:
            reels = random.sample(SLOT_EMOJIS, 3)
            won, result = 0, "lose"

    if not admin_override:
        _update_rtp_penalty(user["id"], won > 0)
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
_crash_bet_lock = asyncio.Lock()  # защита от двойной ставки в краше
MAX_CRASH_POINT = 25.0            # максимальный множитель краша


def _gen_crash(chance=None):
    """Генерирует точку краша с учётом GLOBAL_WIN_CHANCE (0–100)."""
    c = GLOBAL_WIN_CHANCE if chance is None else chance
    if c >= 100:
        return round(random.uniform(20.0, MAX_CRASH_POINT), 2)
    if c <= 0:
        return round(random.uniform(1.01, 1.05), 2)
    early_prob = 0.18 * (1 - c / 100)
    r = random.random()
    if r < early_prob * 0.44:
        return round(random.uniform(1.01, 1.05), 2)
    if r < early_prob:
        return round(random.uniform(1.05, 1.25), 2)
    lam = max(0.3, 3.5 * (1 - c / 100) + 0.3)
    val = 1.10 + random.expovariate(lam)
    val += random.uniform(-0.03, 0.03)
    return min(MAX_CRASH_POINT, max(1.10, round(val, 2)))


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
        # Сброс состояния и переход в waiting — атомарно с _crash_bet_lock,
        # иначе ставка, оформленная во время перехода, может быть стёрта.
        async with _crash_bet_lock:
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

        # Решение «летим / пропускаем» — тоже под локом, чтобы ставка
        # не могла попасть в раунд после того, как мы решили его пропустить.
        async with _crash_bet_lock:
            if not _crash["players"]:
                _crash["phase"] = "skipped"  # маркер: bet увидит «не waiting» и откажет
                start_round = False
            else:
                _crash["phase"] = "flying"
                _crash["time_left"] = 0
                start_round = True

        if not start_round:
            await asyncio.sleep(0.5)
            continue

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
                    _crash["crash_point"] = min(MAX_CRASH_POINT, round(mult * random.uniform(1.2, 4.0), 2))
                    _crash["extended"] = True

            if mult >= _crash["crash_point"]:
                _crash["multiplier"] = _crash["crash_point"]
                break
            await asyncio.sleep(0.07)

        _crash["phase"] = "crashed"
        # Обновляем RTP-штраф только для проигравших (победители получили штраф в момент кэшаута)
        for uid_str, pdata in _crash["players"].items():
            if not pdata["cashed_out"]:
                _update_rtp_penalty(int(uid_str), False)
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
    async with _crash_bet_lock:
        if _crash["phase"] != "waiting":
            raise HTTPException(400, "Набор закрыт — ждите следующего раунда")
        uid = str(user["id"])
        if uid in _crash["players"]:
            raise HTTPException(400, "Вы уже в этом раунде")
        bet = max(10, int(body.get("amount", 100)))
        luck = body.get("luck", -1)
        if isinstance(luck, (int, float)) and 0 <= luck <= 100 and _is_admin(user):
            _crash["crash_point"] = _gen_crash(int(luck))
        async with aiosqlite.connect(DB_PATH) as db:
            cur = await db.execute(
                "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
                (bet, user["id"], bet),
            )
            if cur.rowcount == 0:
                raise HTTPException(400, "Недостаточно звёзд")
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
    _update_rtp_penalty(user["id"], True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (won, user["id"]))
        await taint_win_if_demo(db, user["id"], p["bet"], won)
        await db.execute(
            "UPDATE crash_bets SET status = 'won', won_amount = ? "
            "WHERE user_id = ? AND round_id = ? AND status = 'active'",
            (won, user["id"], _crash["round_id"]),
        )
        await db.commit()
        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()
    return {"ok": True, "won": won, "multiplier": mult, "new_balance": row[0]}


# ===== MINER (САПЁР) =====

@router.post("/miner/start")
async def miner_start(body: dict, user: dict = Depends(get_current_user)):
    """Начать игру в сапёр. Списывает ставку и создаёт игру."""
    import time
    _cleanup_old_miner_games()  # Очищаем старые игры
    
    bet = int(body.get("bet", 100))
    mines = int(body.get("mines", 3))
    
    if bet < 10:
        raise HTTPException(status_code=400, detail="Минимальная ставка — 10 звёзд")
    if mines < 1 or mines > 6:
        raise HTTPException(status_code=400, detail="Мины: от 1 до 6")
    if user["balance"] < bet:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")
    
    game_id = str(uuid.uuid4())

    # Списываем ставку и записываем в БД атомарно
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
            (bet, user["id"], bet),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=400, detail="Недостаточно звёзд")
        await db.execute(
            "INSERT INTO miner_bets (game_id, user_id, amount) VALUES (?, ?, ?)",
            (game_id, user["id"], bet),
        )
        await db.commit()
        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()

    # Создаём игру
    _miner_games[game_id] = {
        "user_id": user["id"],
        "bet": bet,
        "mines": mines,
        "found": 0,
        "mult": 1.0,
        "cells": [None] * MINER_CELLS,  # None = не открыта, 'safe' = безопасно, 'mine' = мина
        "active": True,
    }
    _miner_game_timestamps[game_id] = time.time()

    return {"ok": True, "game_id": game_id, "new_balance": row[0]}


@router.post("/miner/click")
async def miner_click(body: dict, user: dict = Depends(get_current_user)):
    """Кликнуть по ячейке в сапёре."""
    game_id = body.get("game_id")
    cell_index = int(body.get("cell_index", 0))
    
    if not game_id or game_id not in _miner_games:
        raise HTTPException(status_code=404, detail="Игра не найдена")
    
    game = _miner_games[game_id]
    if game["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Не ваша игра")
    if not game["active"]:
        raise HTTPException(status_code=400, detail="Игра уже завершена")
    if cell_index < 0 or cell_index >= MINER_CELLS:
        raise HTTPException(status_code=400, detail="Неверная ячейка")
    if game["cells"][cell_index] is not None:
        raise HTTPException(status_code=400, detail="Ячейка уже открыта")
    
    # Реалистичная вероятность: P(safe) = оставшиеся_безопасные / оставшиеся_ячейки
    remaining_cells = MINER_CELLS - game["found"]
    remaining_safe = (MINER_CELLS - game["mines"]) - game["found"]
    base_chance = remaining_safe / remaining_cells  # честная вероятность

    # Удача админа — смещает вероятность относительно базовой
    luck = body.get("luck", -1)
    if isinstance(luck, (int, float)) and 0 <= luck <= 100 and _is_admin(user):
        # luck=50 → база, luck=100 → гарантия безопасно, luck=0 → гарантия мина
        safe_chance = base_chance + (luck / 100 - 0.5) * 2 * (1 - base_chance) if luck >= 50 \
            else base_chance * (luck / 50)
        safe_chance = max(0.0, min(1.0, safe_chance))
    else:
        # Применяем MINER_HOUSE: увеличиваем вероятность мины на 10%
        safe_chance = max(0.0, 1.0 - (1.0 - base_chance) * MINER_HOUSE)

    if random.random() < safe_chance:
        # БЕЗОПАСНО
        game["cells"][cell_index] = "safe"
        game["found"] += 1

        max_safe = MINER_CELLS - game["mines"]

        # Сначала проверяем auto-win — ПЕРЕД вычислением множителя,
        # чтобы избежать деления на ноль (left - mines = 0 на последней ячейке)
        if game["found"] >= max_safe:
            game["active"] = False
            won = max(int(game["bet"] * game["mult"]), game["bet"])  # минимум возврат ставки
            _update_rtp_penalty(user["id"], True)
            async with aiosqlite.connect(DB_PATH) as db:
                await db.execute(
                    "UPDATE users SET balance = balance + ? WHERE id = ?",
                    (won, user["id"]),
                )
                await taint_win_if_demo(db, user["id"], game["bet"], won)
                await db.execute(
                    "UPDATE miner_bets SET status = 'won' WHERE game_id = ?", (game_id,)
                )
                await db.commit()
                cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
                row = await cur.fetchone()
            return {
                "ok": True,
                "result": "win",
                "cell": "safe",
                "mult": round(game["mult"], 2),
                "won": won,
                "new_balance": row[0],
            }

        # Считаем множитель только если игра продолжается (left > mines гарантировано)
        left = MINER_CELLS - game["found"]
        denom = left - game["mines"]
        if denom > 0:
            step_mult = (left / denom) * MINER_CUT
            game["mult"] *= step_mult

        return {
            "ok": True,
            "result": "safe",
            "cell": "safe",
            "mult": round(game["mult"], 2),
            "potential": int(game["bet"] * game["mult"]),
        }
    else:
        # МИНА
        game["cells"][cell_index] = "mine"
        game["active"] = False
        # Открываем все мины
        for i in range(MINER_CELLS):
            if game["cells"][i] is None:
                game["cells"][i] = "ghost"

        _update_rtp_penalty(user["id"], False)
        # Закрываем ставку в БД (ставка уже списана при старте, не возвращаем)
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE miner_bets SET status = 'lost' WHERE game_id = ?", (game_id,)
            )
            await db.commit()

        return {
            "ok": True,
            "result": "lose",
            "cell": "mine",
            "lost": game["bet"],
        }


@router.post("/miner/cashout")
async def miner_cashout(body: dict, user: dict = Depends(get_current_user)):
    """Забрать выигрыш в сапёре."""
    game_id = body.get("game_id")
    
    if not game_id or game_id not in _miner_games:
        raise HTTPException(status_code=404, detail="Игра не найдена")
    
    game = _miner_games[game_id]
    if game["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Не ваша игра")
    if not game["active"]:
        raise HTTPException(status_code=400, detail="Игра уже завершена")
    if game["found"] == 0:
        raise HTTPException(status_code=400, detail="Сначала откройте ячейку")
    
    game["active"] = False
    won = int(game["bet"] * game["mult"])
    _update_rtp_penalty(user["id"], True)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            (won, user["id"]),
        )
        await taint_win_if_demo(db, user["id"], game["bet"], won)
        await db.execute(
            "UPDATE miner_bets SET status = 'won' WHERE game_id = ?", (game_id,)
        )
        await db.commit()
        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()

    return {
        "ok": True,
        "won": won,
        "mult": round(game["mult"], 2),
        "new_balance": row[0],
    }
