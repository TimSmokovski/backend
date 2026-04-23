"""
Telegram webhook — обработка обновлений от Telegram прямо в FastAPI.
Заменяет bot.py для production (Railway).
"""
import os
import httpx
from fastapi import APIRouter, Request
import aiosqlite
from database import DB_PATH

router = APIRouter(prefix="/telegram", tags=["telegram"])

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")
BOT_USERNAME = os.getenv("BOT_USERNAME", "")
ADMIN_IDS = set(
    int(i.strip()) for i in os.getenv("ADMIN_IDS", "").split(",")
    if i.strip().lstrip("-").isdigit()
)
ADMIN_USERNAMES = set(
    u.strip().lstrip("@")
    for u in os.getenv("ADMIN_USERNAMES", "").split(",")
    if u.strip()
)

TG = f"https://api.telegram.org/bot{BOT_TOKEN}"


async def tg(method: str, **kwargs):
    async with httpx.AsyncClient() as client:
        await client.post(f"{TG}/{method}", json=kwargs)


@router.post("/webhook")
async def webhook(request: Request):
    data = await request.json()

    # ── pre_checkout_query ──────────────────────────────────────────────────
    if "pre_checkout_query" in data:
        pcq = data["pre_checkout_query"]
        await tg("answerPreCheckoutQuery", pre_checkout_query_id=pcq["id"], ok=True)
        return {"ok": True}

    msg = data.get("message", {})
    if not msg:
        return {"ok": True}

    chat_id = msg.get("chat", {}).get("id")
    from_user = msg.get("from", {})
    user_id = from_user.get("id")

    # ── successful_payment ──────────────────────────────────────────────────
    if "successful_payment" in msg:
        payment = msg["successful_payment"]
        stars = payment["total_amount"]
        payload = payment.get("invoice_payload", "")

        try:
            payer_id = int(payload.split(":")[0])
        except Exception:
            payer_id = user_id

        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE users SET balance = balance + ? WHERE id = ?",
                (stars, payer_id),
            )
            cur = await db.execute("SELECT ref_by FROM users WHERE id = ?", (payer_id,))
            row = await cur.fetchone()
            if row and row[0]:
                ref_bonus = max(1, stars // 10)
                await db.execute(
                    "UPDATE users SET balance = balance + ? WHERE id = ?",
                    (ref_bonus, row[0]),
                )
            await db.commit()

        await tg("sendMessage", chat_id=chat_id,
                 text=f"✅ Баланс пополнен на {stars} ⭐\nПриятной игры!")
        return {"ok": True}

    # ── команды ────────────────────────────────────────────────────────────
    text = msg.get("text", "")

    if text.startswith("/start"):
        parts = text.split()
        ref = parts[1] if len(parts) > 1 else None
        webapp_url = WEBAPP_URL
        if ref and ref.startswith("ref_"):
            ref_id = ref.replace("ref_", "")
            sep = "&" if "?" in WEBAPP_URL else "?"
            webapp_url = f"{WEBAPP_URL}{sep}ref={ref_id}"

        first_name = from_user.get("first_name", "")
        await tg("sendMessage",
                 chat_id=chat_id,
                 parse_mode="Markdown",
                 text=(
                     f"👋 Привет, {first_name}!\n\n"
                     "🎰 *LkStars* — открывай кейсы, бейся в PvP и выигрывай звёзды!\n\n"
                     "🆓 Бесплатный кейс доступен каждые 24 часа.\n"
                     "👥 Приглашай друзей — получай *10%* от их пополнений!"
                 ),
                 reply_markup={"inline_keyboard": [[
                     {"text": "🎰 Играть", "web_app": {"url": webapp_url}}
                 ]]})

    elif text.startswith("/admin"):
        username = from_user.get("username", "").lstrip("@")
        if user_id not in ADMIN_IDS and username not in ADMIN_USERNAMES:
            await tg("sendMessage", chat_id=chat_id, text="⛔ Нет доступа.")
        else:
            await tg("sendMessage",
                     chat_id=chat_id,
                     text="🔑 Добро пожаловать в админ панель:",
                     reply_markup={"inline_keyboard": [[
                         {"text": "⚙️ Админ панель",
                          "web_app": {"url": WEBAPP_URL.rstrip("/") + "/admin.html"}}
                     ]]})

    elif text.startswith("/help"):
        await tg("sendMessage",
                 chat_id=chat_id,
                 parse_mode="Markdown",
                 text="ℹ️ *Команды:*\n/start — Запустить бота\n/play — Открыть игру")

    elif text.startswith("/play"):
        await tg("sendMessage",
                 chat_id=chat_id,
                 text="Нажми кнопку ниже:",
                 reply_markup={"inline_keyboard": [[
                     {"text": "🎰 Открыть игру", "web_app": {"url": WEBAPP_URL}}
                 ]]})

    return {"ok": True}
