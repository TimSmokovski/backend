"""
Telegram Bot — точка входа в Mini App
"""
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-frontend.netlify.app")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    ref = context.args[0] if context.args else None

    # Сохраняем реферала (можно доработать через API)
    if ref and ref.startswith("ref_"):
        ref_id = ref.replace("ref_", "")
        # TODO: зарегистрировать реферала через API

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton(
            "🎰 Играть",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    ]])

    await update.message.reply_text(
        f"👋 Привет, {user.first_name}!\n\n"
        "🎰 *CaseArena* — открывай кейсы, бейся в PvP и выигрывай звёзды!\n\n"
        "⭐ Каждый новый игрок получает *1000 звёзд* на старт.\n"
        "🆓 Бесплатный кейс доступен каждые 24 часа.\n"
        "👥 Приглашай друзей — получай *10%* от их пополнений!",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


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


def main():
    if not BOT_TOKEN:
        print("❌ Укажи BOT_TOKEN в файле .env")
        return

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("play", play))

    print("✅ Бот запущен!")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
