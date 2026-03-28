import json
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH
from auth import get_current_user

router = APIRouter(tags=["social"])

BOT_TOKEN    = os.getenv("BOT_TOKEN", "")
BOT_USERNAME = os.getenv("BOT_USERNAME", "backendpvp_bot")
REF_BONUS    = 100  # звёзд за каждого приглашённого


async def _is_subscribed(user_id: int, channel: str) -> bool:
    """Проверяет подписку через getChatMember. Бот должен быть админом канала."""
    if not channel.startswith("@"):
        channel = "@" + channel
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                f"https://api.telegram.org/bot{BOT_TOKEN}/getChatMember",
                params={"chat_id": channel, "user_id": user_id},
            )
            data = r.json()
        status = data.get("result", {}).get("status", "left")
        return status in ("member", "creator", "administrator", "restricted")
    except Exception:
        return False


@router.get("/tasks")
async def get_tasks(user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM tasks WHERE active = 1")
        tasks = await cur.fetchall()
        cur2 = await db.execute("SELECT task_id FROM user_tasks WHERE user_id = ?", (user["id"],))
        done_ids = {r[0] for r in await cur2.fetchall()}
        cur3 = await db.execute("SELECT COUNT(*) FROM users WHERE ref_by = ?", (user["id"],))
        invited_count = (await cur3.fetchone())[0]

    result = []
    for t in tasks:
        task_type = t["type"] if "type" in t.keys() else None
        item = {
            "id": t["id"], "name": t["name"], "icon": t["icon"],
            "reward": t["reward"], "url": t["url"],
            "type": task_type, "done": t["id"] in done_ids,
        }
        if task_type == "invite_friends":
            item["progress"] = min(invited_count, 3)
            item["progress_max"] = 3
        result.append(item)
    return result


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

    task_type = task["type"] if "type" in task.keys() else None

    # ── Проверка подписки на канал ─────────────────────────────────────────
    if task_type == "channel_sub":
        url = task["url"] or ""
        # Извлекаем username из ссылки t.me/username
        channel = url.rstrip("/").split("/")[-1]
        if not channel:
            raise HTTPException(400, "Канал не настроен — обратись к администратору")
        subscribed = await _is_subscribed(user["id"], channel)
        if not subscribed:
            raise HTTPException(400, "Сначала подпишись на канал, затем нажми «Проверить»")

    # ── Проверка приглашения 3 друзей ──────────────────────────────────────
    elif task_type == "invite_friends":
        async with aiosqlite.connect(DB_PATH) as db:
            cur = await db.execute(
                "SELECT COUNT(*) FROM users WHERE ref_by = ?", (user["id"],)
            )
            invited = (await cur.fetchone())[0]
        if invited < 3:
            raise HTTPException(
                400, f"Нужно пригласить 3 друзей. Приглашено: {invited}/3"
            )

    # ── Зачисляем награду ─────────────────────────────────────────────────
    async with aiosqlite.connect(DB_PATH) as db:
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
    return {
        "friends": count,
        "earned": count * REF_BONUS,
        "ref_link": f"https://t.me/{BOT_USERNAME}?start=ref_{user['id']}",
    }


@router.post("/ref/apply")
async def apply_referral(body: dict, user: dict = Depends(get_current_user)):
    raw = body.get("ref_id", "")
    try:
        ref_id = int(str(raw).replace("ref_", ""))
    except Exception:
        return {"ok": False, "detail": "bad ref_id"}
    if ref_id == user["id"]:
        return {"ok": False, "detail": "self-ref"}
    async with aiosqlite.connect(DB_PATH) as db:
        # Применяем только если реферал ещё не установлен
        cur = await db.execute("SELECT ref_by FROM users WHERE id = ?", (user["id"],))
        row = await cur.fetchone()
        if row and row[0]:
            return {"ok": False, "detail": "already set"}
        # Проверяем что реферер существует
        cur2 = await db.execute("SELECT id FROM users WHERE id = ?", (ref_id,))
        if not await cur2.fetchone():
            return {"ok": False, "detail": "referrer not found"}
        await db.execute("UPDATE users SET ref_by = ? WHERE id = ?", (ref_id, user["id"]))
        await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (REF_BONUS, ref_id))
        await db.commit()
    return {"ok": True}


@router.get("/leaderboard")
async def leaderboard():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM users ORDER BY balance DESC LIMIT 10")
        users = await cur.fetchall()
    prizes = ["💎", "🏆", "🥇", "🚀", "💰", "💍", "🪙", "💵", "🎯", "🎁"]
    return [
        {"rank": i+1, "name": u["name"] or "Игрок", "username": u["username"] or "",
         "stars": u["balance"],
         "photo_url": u["photo_url"], "avatar": (u["name"] or "И")[0].upper(),
         "prize": prizes[i]}
        for i, u in enumerate(users)
    ]
