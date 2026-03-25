import random
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH
from auth import get_current_user

router = APIRouter(prefix="/pvp", tags=["pvp"])


@router.get("/rooms")
async def get_rooms():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT r.*, u.name FROM pvp_rooms r LEFT JOIN users u ON u.id = r.host_id WHERE r.status = 'waiting' LIMIT 10"
        )
        rows = await cur.fetchall()
    return [
        {
            "id": r["id"],
            "host": r["name"] or "Игрок",
            "avatar": (r["name"] or "И")[0].upper(),
            "bet": r["bet"],
        }
        for r in rows
    ]


@router.post("/create")
async def create_room(body: dict, user: dict = Depends(get_current_user)):
    bet = int(body.get("bet", 100))
    if user["balance"] < bet:
        raise HTTPException(status_code=400, detail="Недостаточно звёзд")

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (bet, user["id"]))
        cur = await db.execute(
            "INSERT INTO pvp_rooms (host_id, bet) VALUES (?, ?)", (user["id"], bet)
        )
        await db.commit()
        room_id = cur.lastrowid

    return {"room_id": room_id, "new_balance": user["balance"] - bet}


@router.post("/{room_id}/join")
async def join_room(room_id: int, user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM pvp_rooms WHERE id = ?", (room_id,))
        room = await cur.fetchone()

        if not room or room["status"] != "waiting":
            raise HTTPException(status_code=404, detail="Комната не найдена")
        if room["host_id"] == user["id"]:
            raise HTTPException(status_code=400, detail="Нельзя играть против себя")
        if user["balance"] < room["bet"]:
            raise HTTPException(status_code=400, detail="Недостаточно звёзд")

        winner_id = random.choice([room["host_id"], user["id"]])
        prize = room["bet"] * 2

        await db.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (room["bet"], user["id"]))
        await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (prize, winner_id))
        await db.execute(
            "UPDATE pvp_rooms SET opponent_id = ?, winner_id = ?, status = 'done' WHERE id = ?",
            (user["id"], winner_id, room_id),
        )
        await db.commit()

        cur = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()

    return {"won": winner_id == user["id"], "prize": prize, "new_balance": row[0]}
