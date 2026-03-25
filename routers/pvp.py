import random
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH
from auth import get_current_user

router = APIRouter(prefix="/pvp", tags=["pvp"])


async def get_or_create_active_round(db) -> int:
    """Возвращает id активного раунда, создаёт новый если нет."""
    cur = await db.execute("SELECT id FROM pvp_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    row = await cur.fetchone()
    if row:
        return row[0]
    cur = await db.execute("INSERT INTO pvp_rounds (status) VALUES ('active')")
    await db.commit()
    return cur.lastrowid


@router.get("/lobby")
async def get_lobby():
    """Получить текущий активный котёл с игроками и шансами."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        round_id = await get_or_create_active_round(db)

        cur = await db.execute(
            """SELECT b.id, b.user_id, b.amount, u.name, u.username
               FROM pvp_bets b
               LEFT JOIN users u ON u.id = b.user_id
               WHERE b.round_id = ?
               ORDER BY b.amount DESC""",
            (round_id,)
        )
        bets = await cur.fetchall()

        total_pot = sum(b["amount"] for b in bets)
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
        "can_draw": len(players) >= 2,
    }


@router.post("/bet")
async def place_bet(body: dict, user: dict = Depends(get_current_user)):
    """Поставить ставку в текущий котёл."""
    amount = int(body.get("amount", 0))
    if amount < 10:
        raise HTTPException(status_code=400, detail="Минимальная ставка — 10 звёзд")
    if user["balance"] < amount:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        round_id = await get_or_create_active_round(db)

        # Проверяем, не ставил ли уже
        cur = await db.execute(
            "SELECT id FROM pvp_bets WHERE round_id = ? AND user_id = ?",
            (round_id, user["id"])
        )
        if await cur.fetchone():
            raise HTTPException(status_code=400, detail="Ты уже поставил в этом раунде")

        await db.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, user["id"]))
        await db.execute(
            "INSERT INTO pvp_bets (round_id, user_id, amount) VALUES (?, ?, ?)",
            (round_id, user["id"], amount)
        )
        await db.commit()

        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()

    return {"success": True, "new_balance": row[0], "round_id": round_id}


@router.post("/draw")
async def draw_winner(user: dict = Depends(get_current_user)):
    """Разыграть котёл (нужно 2+ игрока)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT id FROM pvp_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Нет активного раунда")

        round_id = row[0]

        cur = await db.execute(
            "SELECT user_id, amount FROM pvp_bets WHERE round_id = ?", (round_id,)
        )
        bets = await cur.fetchall()

        if len(bets) < 2:
            raise HTTPException(status_code=400, detail="Нужно минимум 2 игрока")

        total_pot = sum(b["amount"] for b in bets)

        # Взвешенный случайный выбор
        users = [b["user_id"] for b in bets]
        weights = [b["amount"] for b in bets]
        winner_id = random.choices(users, weights=weights, k=1)[0]

        # Начисляем выигрыш
        await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (total_pot, winner_id))
        await db.execute(
            "UPDATE pvp_rounds SET status = 'done', winner_id = ?, total_pot = ? WHERE id = ?",
            (winner_id, total_pot, round_id)
        )
        # Создаём новый раунд
        await db.execute("INSERT INTO pvp_rounds (status) VALUES ('active')")
        await db.commit()

        cur = await db.execute("SELECT name FROM users WHERE id = ?", (winner_id,))
        winner = await cur.fetchone()

    return {
        "winner_id": winner_id,
        "winner_name": winner[0] or "Игрок",
        "total_pot": total_pot,
        "i_won": winner_id == user["id"],
    }
