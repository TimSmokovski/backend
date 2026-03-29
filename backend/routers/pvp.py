import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH, taint_win_if_demo
from auth import get_current_user
from routers.games import _is_admin

router = APIRouter(prefix="/pvp", tags=["pvp"])

_pvp_luck = {}  # round_id -> {"user_id": int, "luck": int}

ROUND_DURATION = 60  # 1 минута
MAX_PLAYERS = 10


async def get_or_create_active_round(db) -> int:
    cur = await db.execute("SELECT id FROM pvp_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    row = await cur.fetchone()
    if row:
        return row[0]
    cur = await db.execute("INSERT INTO pvp_rounds (status) VALUES ('active')")
    await db.commit()
    return cur.lastrowid


async def try_resolve_round(db, round_id: int) -> dict | None:
    """Разыгрывает раунд если нужно. Возвращает результат или None."""
    cur = await db.execute("SELECT user_id, amount FROM pvp_bets WHERE round_id = ?", (round_id,))
    bets = await cur.fetchall()
    if len(bets) < 2:
        return None

    total_pot = sum(b[1] for b in bets)
    users = [b[0] for b in bets]
    weights = [b[1] for b in bets]
    luck_info = _pvp_luck.pop(round_id, None)
    if luck_info and luck_info["user_id"] in users:
        admin_uid = luck_info["user_id"]
        luck = luck_info["luck"]
        if luck >= 100:
            winner_id = admin_uid
        elif luck <= 0:
            others = [u for u in users if u != admin_uid]
            if others:
                other_weights = [weights[i] for i, u in enumerate(users) if u != admin_uid]
                winner_id = random.choices(others, weights=other_weights, k=1)[0]
            else:
                winner_id = random.choices(users, weights=weights, k=1)[0]
        else:
            winner_id = random.choices(users, weights=weights, k=1)[0]
    else:
        winner_id = random.choices(users, weights=weights, k=1)[0]

    await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (total_pot, winner_id))
    cur_wb = await db.execute("SELECT amount FROM pvp_bets WHERE round_id = ? AND user_id = ?", (round_id, winner_id))
    winner_bet_row = await cur_wb.fetchone()
    winner_bet = winner_bet_row[0] if winner_bet_row else 0
    await taint_win_if_demo(db, winner_id, winner_bet, total_pot)
    await db.execute(
        "UPDATE pvp_rounds SET status = 'done', winner_id = ?, total_pot = ? WHERE id = ?",
        (winner_id, total_pot, round_id)
    )
    await db.execute("INSERT INTO pvp_rounds (status) VALUES ('active')")
    await db.commit()

    cur = await db.execute("SELECT name FROM users WHERE id = ?", (winner_id,))
    winner = await cur.fetchone()
    return {"winner_id": winner_id, "winner_name": winner[0] or "Игрок", "total_pot": total_pot}


@router.get("/lobby")
async def get_lobby():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Добавляем колонку если не существует (миграция)
        try:
            await db.execute("ALTER TABLE pvp_rounds ADD COLUMN started_at TEXT")
            await db.commit()
        except Exception:
            pass

        round_id = await get_or_create_active_round(db)

        cur = await db.execute("SELECT started_at FROM pvp_rounds WHERE id = ?", (round_id,))
        round_row = await cur.fetchone()
        started_at = round_row["started_at"] if round_row else None

        cur = await db.execute(
            """SELECT b.user_id, b.amount, u.name
               FROM pvp_bets b LEFT JOIN users u ON u.id = b.user_id
               WHERE b.round_id = ? ORDER BY b.amount DESC""",
            (round_id,)
        )
        bets = await cur.fetchall()
        total_pot = sum(b["amount"] for b in bets)
        player_count = len(bets)

        # Проверяем таймер
        time_left = None
        auto_resolved = None
        if started_at and player_count >= 2:
            started_dt = datetime.fromisoformat(started_at)
            elapsed = (datetime.now(timezone.utc) - started_dt.replace(tzinfo=timezone.utc)).total_seconds()
            time_left = max(0, ROUND_DURATION - int(elapsed))

            if time_left == 0:
                auto_resolved = await try_resolve_round(db, round_id)
                if auto_resolved:
                    return {
                        "round_id": round_id,
                        "players": [],
                        "total_pot": 0,
                        "time_left": 0,
                        "auto_resolved": auto_resolved,
                    }

        players = [
            {
                "user_id": b["user_id"],
                "name": b["name"] or "Игрок",
                "avatar": (b["name"] or "И")[0].upper(),
                "amount": b["amount"],
                "chance": round(b["amount"] / total_pot * 100, 1) if total_pot > 0 else 0,
            }
            for b in bets
        ]

    return {
        "round_id": round_id,
        "players": players,
        "total_pot": total_pot,
        "time_left": time_left,
        "player_count": player_count,
        "max_players": MAX_PLAYERS,
    }


@router.post("/bet")
async def place_bet(body: dict, user: dict = Depends(get_current_user)):
    amount = int(body.get("amount", 0))
    if amount < 10:
        raise HTTPException(status_code=400, detail="Минимальная ставка — 10 звёзд")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        round_id = await get_or_create_active_round(db)

        luck = body.get("luck", -1)
        if isinstance(luck, (int, float)) and 0 <= luck <= 100 and _is_admin(user):
            _pvp_luck[round_id] = {"user_id": user["id"], "luck": int(luck)}

        cur = await db.execute("SELECT started_at FROM pvp_rounds WHERE id = ?", (round_id,))
        round_row = await cur.fetchone()

        cur = await db.execute("SELECT id FROM pvp_bets WHERE round_id = ? AND user_id = ?", (round_id, user["id"]))
        if await cur.fetchone():
            raise HTTPException(status_code=400, detail="Ты уже поставил в этом раунде")

        cur = await db.execute("SELECT COUNT(*) FROM pvp_bets WHERE round_id = ?", (round_id,))
        count = (await cur.fetchone())[0]
        if count >= MAX_PLAYERS:
            raise HTTPException(status_code=400, detail="Комната заполнена")

        cur = await db.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
            (amount, user["id"], amount),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=400, detail="Недостаточно звёзд")
        await db.execute("INSERT INTO pvp_bets (round_id, user_id, amount) VALUES (?, ?, ?)", (round_id, user["id"], amount))

        # Если стало 2 игрока — запускаем таймер
        if count + 1 == 2 and not round_row["started_at"]:
            now = datetime.now(timezone.utc).isoformat()
            await db.execute("UPDATE pvp_rounds SET started_at = ? WHERE id = ?", (now, round_id))

        await db.commit()

        # Если 10 игроков — авторазыгрываем
        auto_resolved = None
        if count + 1 >= MAX_PLAYERS:
            auto_resolved = await try_resolve_round(db, round_id)

        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()

    return {
        "success": True,
        "new_balance": row[0],
        "auto_resolved": auto_resolved,
    }
