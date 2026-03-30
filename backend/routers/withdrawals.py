from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH
from auth import get_current_user
from routers.admin import require_admin

router = APIRouter(tags=["withdrawals"])

WITHDRAWAL_MIN = 100


# ── пользователь ───────────────────────────────────────────────────────────

@router.post("/withdrawals/request")
async def request_withdrawal(body: dict, user: dict = Depends(get_current_user)):
    amount = body.get("amount")
    username = (body.get("ton_address") or "").strip().lstrip("@")

    if not isinstance(amount, int) or amount < WITHDRAWAL_MIN:
        raise HTTPException(400, f"Минимальная сумма — {WITHDRAWAL_MIN} ⭐")
    if not username:
        raise HTTPException(400, "Укажи Telegram username")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT balance, COALESCE(demo_balance,0) as demo_balance FROM users WHERE id = ?",
            (user["id"],),
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "Пользователь не найден")

        real_balance = row["balance"] - row["demo_balance"]
        if real_balance < amount:
            raise HTTPException(400, f"Недостаточно звёзд (доступно {real_balance} ⭐)")

        await db.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ?", (amount, user["id"])
        )
        await db.execute(
            "INSERT INTO withdrawals (user_id, amount, ton_address) VALUES (?, ?, ?)",
            (user["id"], amount, username),
        )
        await db.commit()

    return {"ok": True, "message": "⏳ Заявка принята — ожидай, скоро обработаем."}


@router.get("/withdrawals/my")
async def my_withdrawals(user: dict = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT id, amount, ton_address, status, created_at FROM withdrawals "
            "WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (user["id"],),
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


# ── админ ──────────────────────────────────────────────────────────────────

@router.get("/admin/withdrawals")
async def admin_withdrawals(status: str = "", _admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if status:
            cur = await db.execute(
                "SELECT w.*, u.name, u.username FROM withdrawals w "
                "LEFT JOIN users u ON u.id = w.user_id "
                "WHERE w.status = ? ORDER BY w.created_at DESC LIMIT 100",
                (status,),
            )
        else:
            cur = await db.execute(
                "SELECT w.*, u.name, u.username FROM withdrawals w "
                "LEFT JOIN users u ON u.id = w.user_id "
                "ORDER BY w.created_at DESC LIMIT 100"
            )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/admin/withdrawals/{wid}/approve")
async def approve_withdrawal(wid: int, _admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT status FROM withdrawals WHERE id = ?", (wid,))
        w = await cur.fetchone()
        if not w:
            raise HTTPException(404, "Заявка не найдена")
        if w["status"] != "pending":
            raise HTTPException(400, f"Статус уже: {w['status']}")
        await db.execute(
            "UPDATE withdrawals SET status = 'done', updated_at = datetime('now') WHERE id = ?",
            (wid,),
        )
        await db.commit()
    return {"ok": True}


@router.post("/admin/withdrawals/{wid}/reject")
async def reject_withdrawal(wid: int, _admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM withdrawals WHERE id = ?", (wid,))
        w = await cur.fetchone()
        if not w:
            raise HTTPException(404, "Заявка не найдена")
        if w["status"] != "pending":
            raise HTTPException(400, f"Статус уже: {w['status']}")
        
        # Возвращаем баланс с учётом demo_balance
        cur_user = await db.execute(
            "SELECT COALESCE(demo_balance, 0) FROM users WHERE id = ?", (w["user_id"],)
        )
        demo_row = await cur_user.fetchone()
        demo_balance = demo_row[0] if demo_row else 0
        
        # Если у пользователя есть demo_balance, уменьшаем его первым
        if demo_balance > 0:
            reduce_demo = min(demo_balance, w["amount"])
            await db.execute(
                "UPDATE users SET demo_balance = demo_balance - ? WHERE id = ?",
                (reduce_demo, w["user_id"]),
            )
        
        await db.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?", (w["amount"], w["user_id"])
        )
        await db.execute(
            "UPDATE withdrawals SET status = 'rejected', updated_at = datetime('now') WHERE id = ?",
            (wid,),
        )
        await db.commit()
    return {"ok": True}
