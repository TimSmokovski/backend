"""
Telegram Bot — точка входа в Mini App
"""
import os
import aiosqlite
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes, PreCheckoutQueryHandler, MessageHandler, filters
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
_BOT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_BOT_DIR, "backend", "casearena.db")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-frontend.netlify.app")

ADMIN_IDS = set(
    int(i.strip()) for i in os.getenv("ADMIN_IDS", "").split(",")
    if i.strip().lstrip("-").isdigit()
)
ADMIN_USERNAMES = set(
    u.strip().lstrip("@")
    for u in os.getenv("ADMIN_USERNAMES", "").split(",")
    if u.strip()
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    ref = context.args[0] if context.args else None

    # Передаём ref_id в URL Mini App — фронт сам отправит на /ref/apply
    webapp_url = WEBAPP_URL
    if ref and ref.startswith("ref_"):
        ref_id = ref.replace("ref_", "")
        sep = "&" if "?" in WEBAPP_URL else "?"
        webapp_url = f"{WEBAPP_URL}{sep}ref={ref_id}"

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton(
            "🎰 Играть",
            web_app=WebAppInfo(url=webapp_url)
        )
    ]])

    await update.message.reply_text(
        f"👋 Привет, {user.first_name}!\n\n"
        "🌟 *LkStars* — открывай кейсы, бейся в PvP и выигрывай звёзды!\n\n"
        "🆓 Бесплатный кейс каждые 24 часа\n"
        "👥 Приглашай друзей — получай *10%* от их пополнений\n\n"
        "👇 Нажми кнопку и начинай!",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


async def admin_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    username = (user.username or "").lstrip("@")
    if user.id not in ADMIN_IDS and username not in ADMIN_USERNAMES:
        await update.message.reply_text("⛔ Нет доступа.")
        return
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("⚙️ Админ панель", web_app=WebAppInfo(url=WEBAPP_URL.rstrip("/") + "/admin.html"))
    ]])
    await update.message.reply_text("🔑 Добро пожаловать в админ панель:", reply_markup=keyboard)


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "ℹ️ *Команды:*\n"
        "/start — Запустить бота\n"
        "/play — Открыть игру",
        parse_mode="Markdown",
    )


async def play(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("🎰 Открыть игру", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    await update.message.reply_text("Нажми кнопку ниже:", reply_markup=keyboard)


async def pre_checkout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.pre_checkout_query.answer(ok=True)


async def successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    payment = update.message.successful_payment
    stars = payment.total_amount  # В XTR total_amount = кол-во звёзд напрямую
    payload = payment.invoice_payload  # Формат: "user_id:amount"

    try:
        user_id = int(payload.split(":")[0])
    except Exception:
        return

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?", (stars, user_id)
        )
        cur = await db.execute("SELECT ref_by FROM users WHERE id = ?", (user_id,))
        row = await cur.fetchone()
        if row and row[0]:
            ref_bonus = max(1, stars // 10)
            await db.execute(
                "UPDATE users SET balance = balance + ? WHERE id = ?", (ref_bonus, row[0])
            )
        await db.commit()

    await update.message.reply_text(f"✅ Баланс пополнен на {stars} ⭐\nПриятной игры!")


import asyncio

def main():
    if not BOT_TOKEN:
        print("❌ Укажи BOT_TOKEN в файле .env")
        return

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("play", play))
    app.add_handler(CommandHandler("admin", admin_cmd))
    app.add_handler(PreCheckoutQueryHandler(pre_checkout))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment))

    print("✅ Бот запущен!")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    asyncio.set_event_loop(asyncio.new_event_loop())
    main()
