import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routers import users, cases, pvp, games, social, admin
from routers.games import crash_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(crash_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="DC_GalaxySpinBot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(cases.router)
app.include_router(pvp.router)
app.include_router(games.router)
app.include_router(social.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"status": "ok", "app": "DC_GalaxySpinBot"}
