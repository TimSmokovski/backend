import json
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH
from auth import get_current_user

router = APIRouter(tags=["social"])


@router.get("/tasks")
async def get_tasks(user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM tasks WHERE active = 1")
        tasks = await cur.fetchall()
        cur2 = await db.execute("SELECT task_id FROM user_tasks WHERE user_id = ?", (user["id"],))
        done_ids = {r[0] for r in await cur2.fetchall()}
    return [
        {"id": t["id"], "name": t["name"], "icon": t["icon"],
         "reward": t["reward"], "url": t["url"], "done": t["id"] in done_ids}
        for t in tasks
    ]


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: int, user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        task = await cur.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Задание не найдено")
        cur2 = await db.execute(
            "SELECT id FROM user_tasks WHERE user_id = ? AND task_id = ?", (user["id"], task_id)
        )
        if await cur2.fetchone():
            raise HTTPException(status_code=400, detail="Уже выполнено")
        await db.execute("INSERT INTO user_tasks (user_id, task_id) VALUES (?, ?)", (user["id"], task_id))
        await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (task["reward"], user["id"]))
        await db.commit()
        cur3 = await db.execute("SELECT balance FROM users WHERE id = ?", (user["id"],))
        row = await cur3.fetchone()
    return {"reward": task["reward"], "new_balance": row[0]}


@router.get("/contests")
async def get_contests():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM contests WHERE active = 1")
        contests = await cur.fetchall()
    return [
        {"id": c["id"], "prizes": json.loads(c["prizes_json"]),
         "prize_count": c["prize_count"], "participants": c["participants"]}
        for c in contests
    ]


@router.post("/contests/{contest_id}/join")
async def join_contest(contest_id: int, user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM contests WHERE id = ? AND active = 1", (contest_id,))
        contest = await cur.fetchone()
        if not contest:
            raise HTTPException(status_code=404, detail="Конкурс не найден")
        cur2 = await db.execute(
            "SELECT id FROM contest_entries WHERE contest_id = ? AND user_id = ?", (contest_id, user["id"])
        )
        if await cur2.fetchone():
            raise HTTPException(status_code=400, detail="Уже участвуете")
        await db.execute("INSERT INTO contest_entries (contest_id, user_id) VALUES (?, ?)", (contest_id, user["id"]))
        await db.execute("UPDATE contests SET participants = participants + 1 WHERE id = ?", (contest_id,))
        await db.commit()
        cur3 = await db.execute("SELECT participants FROM contests WHERE id = ?", (contest_id,))
        row = await cur3.fetchone()
    return {"ok": True, "participants": row[0]}


@router.get("/referral")
async def get_referral(user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT COUNT(*) FROM users WHERE ref_by = ?", (user["id"],))
        count = (await cur.fetchone())[0]
    return {"friends": count, "earned": count * 100, "ref_link": f"https://t.me/YourBot?start=ref_{user['id']}"}


@router.get("/leaderboard")
async def leaderboard():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM users ORDER BY balance DESC LIMIT 10")
        users = await cur.fetchall()
    prizes = ["💎", "🏆", "🥇", "🚀", "💰", "💍", "🪙", "💵", "🎯", "🎁"]
    return [
        {"rank": i+1, "name": u["name"] or "Игрок", "stars": u["balance"],
         "photo_url": u["photo_url"], "avatar": (u["name"] or "И")[0].upper(),
         "prize": prizes[i]}
        for i, u in enumerate(users)
    ]
