import asyncio
import os
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routers import users, cases, pvp, games, social, admin, payments, telegram, withdrawals
from routers.games import crash_loop

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "")


async def _set_webhook():
    if not BOT_TOKEN or not BACKEND_URL:
        return
    url = f"{BACKEND_URL.rstrip('/')}/telegram/webhook"
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook",
            json={"url": url, "drop_pending_updates": True},
        )
        print(f"[webhook] {r.json()}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await _set_webhook()
    task = asyncio.create_task(crash_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="DC_GalaxySpinBot API", version="1.0.0", lifespan=lifespan)

# CORS middleware - разрешаем GitHub Pages и Telegram
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://timsmokovski.github.io",
        "https://web.telegram.org",
        "https://t.me",
        "https://backend-production-128d.up.railway.app",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(cases.router)
app.include_router(pvp.router)
app.include_router(games.router)
app.include_router(social.router)
app.include_router(admin.router)
app.include_router(payments.router)
app.include_router(telegram.router)
app.include_router(withdrawals.router)


@app.get("/")
async def root():
    return {"status": "ok", "app": "DC_GalaxySpinBot"}
