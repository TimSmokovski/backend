import httpx
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from database import DB_PATH, get_setting, set_setting
from auth import get_current_user
from routers.admin import require_admin

router = APIRouter(tags=["withdrawals"])

WITHDRAWAL_MIN = 50


# ── helpers ────────────────────────────────────────────────────────────────

async def _fragment_payout(api_key: str, api_url: str, user_id: int, stars: int, username: str = ""):
    """Вызов Fragment API. Возвращает (ok: bool, raw_response: dict)."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"user_id": user_id, "username": username, "amount": stars},
            )
            data = resp.json()
        ok = bool(data.get("ok") or data.get("success") or resp.status_code in (200, 201))
        return ok, data
    except Exception as e:
        return False, {"error": str(e)}


# ── пользователь: запрос вывода ────────────────────────────────────────────

@router.post("/withdrawals/request")
async def request_withdrawal(body: dict, user: dict = Depends(get_current_user)):
    amount = body.get("amount")
    username = (body.get("ton_address") or "").strip().lstrip("@")

    if not isinstance(amount, int) or amount < WITHDRAWAL_MIN:
        raise HTTPException(400, f"Минимальная сумма вывода — {WITHDRAWAL_MIN} ⭐")
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
            raise HTTPException(400, f"Недостаточно реальных звёзд (доступно {real_balance} ⭐)")

        # Списываем баланс сразу
        await db.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ?", (amount, user["id"])
        )
        cur2 = await db.execute(
            "INSERT INTO withdrawals (user_id, amount, ton_address) VALUES (?, ?, ?)",
            (user["id"], amount, username),
        )
        withdrawal_id = cur2.lastrowid
        await db.commit()

    # Пробуем автовывод через Fragment
    api_key = await get_setting("fragment_api_key", "")
    api_url = await get_setting("fragment_api_url", "")
    auto = await get_setting("withdrawal_auto", False)

    status = "pending"
    fragment_response = None

    if auto and api_key and api_url:
        ok, resp_data = await _fragment_payout(api_key, api_url, user["id"], amount, username)
        import json
        fragment_response = json.dumps(resp_data)
        status = "done" if ok else "pending"

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE withdrawals SET status = ?, fragment_response = ?, updated_at = datetime('now') WHERE id = ?",
            (status, fragment_response, withdrawal_id),
        )
        await db.commit()

    msg = "✅ Вывод обрабатывается — средства придут на TON-кошелёк." if status == "done" \
        else "⏳ Заявка принята — обрабатывается вручную, ожидай."
    return {"ok": True, "status": status, "message": msg, "id": withdrawal_id}


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


# ── админ: список заявок ───────────────────────────────────────────────────

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
        cur = await db.execute("SELECT * FROM withdrawals WHERE id = ?", (wid,))
        w = await cur.fetchone()
        if not w:
            raise HTTPException(404, "Заявка не найдена")
        if w["status"] != "pending":
            raise HTTPException(400, f"Статус уже: {w['status']}")

        api_key = await get_setting("fragment_api_key", "")
        api_url = await get_setting("fragment_api_url", "")

        import json
        if api_key and api_url:
            ok, resp_data = await _fragment_payout(api_key, api_url, w["user_id"], w["amount"])
            status = "done" if ok else "pending"
            fragment_response = json.dumps(resp_data)
        else:
            status = "done"
            fragment_response = json.dumps({"manual": True})

        await db.execute(
            "UPDATE withdrawals SET status = ?, fragment_response = ?, updated_at = datetime('now') WHERE id = ?",
            (status, fragment_response, wid),
        )
        await db.commit()
    return {"ok": True, "status": status}


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
        # Возвращаем звёзды
        await db.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?", (w["amount"], w["user_id"])
        )
        await db.execute(
            "UPDATE withdrawals SET status = 'rejected', updated_at = datetime('now') WHERE id = ?",
            (wid,),
        )
        await db.commit()
    return {"ok": True}


# ── админ: настройки Fragment ──────────────────────────────────────────────

@router.get("/admin/withdrawal-settings")
async def get_withdrawal_settings(_admin: dict = Depends(require_admin)):
    return {
        "fragment_api_key": await get_setting("fragment_api_key", ""),
        "fragment_api_url": await get_setting("fragment_api_url", ""),
        "withdrawal_auto":  await get_setting("withdrawal_auto", False),
        "withdrawal_min":   await get_setting("withdrawal_min", WITHDRAWAL_MIN),
    }


@router.post("/admin/withdrawal-settings")
async def save_withdrawal_settings(body: dict, _admin: dict = Depends(require_admin)):
    if "fragment_api_key" in body:
        await set_setting("fragment_api_key", body["fragment_api_key"])
    if "fragment_api_url" in body:
        await set_setting("fragment_api_url", body["fragment_api_url"])
    if "withdrawal_auto" in body:
        await set_setting("withdrawal_auto", bool(body["withdrawal_auto"]))
    if "withdrawal_min" in body:
        v = max(1, int(body["withdrawal_min"]))
        await set_setting("withdrawal_min", v)
    return {"ok": True}
