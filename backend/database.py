import aiosqlite
import json
from datetime import datetime

DB_PATH = "./casearena.db"


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id          INTEGER PRIMARY KEY,
                name        TEXT DEFAULT 'Игрок',
                username    TEXT,
                balance     INTEGER DEFAULT 1000,
                ref_by      INTEGER,
                created_at  TEXT DEFAULT (datetime('now')),
                free_case_at TEXT
            );

            CREATE TABLE IF NOT EXISTS pvp_rooms (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                host_id     INTEGER NOT NULL,
                bet         INTEGER NOT NULL,
                opponent_id INTEGER,
                winner_id   INTEGER,
                status      TEXT DEFAULT 'waiting',
                created_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT NOT NULL,
                icon    TEXT DEFAULT 'link',
                reward  INTEGER DEFAULT 1,
                url     TEXT,
                active  INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS user_tasks (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id INTEGER NOT NULL,
                done_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS contests (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                prizes_json  TEXT NOT NULL,
                prize_count  INTEGER NOT NULL,
                participants INTEGER DEFAULT 0,
                active       INTEGER DEFAULT 1,
                ends_at      TEXT
            );

            CREATE TABLE IF NOT EXISTS contest_entries (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                contest_id  INTEGER NOT NULL,
                user_id     INTEGER NOT NULL
            );
        """)
        await db.commit()

        # Заполняем задания
        cursor = await db.execute("SELECT COUNT(*) FROM tasks")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await db.executemany(
                "INSERT INTO tasks (name, icon, reward, url) VALUES (?, ?, ?, ?)",
                [
                    ("Ссылка", "link", 1, None),
                    ("История", "link", 1, None),
                    ("Подписаться на наш канал", "tg", 1, "https://t.me/example"),
                    ("Подписаться на Instagram", "ig", 1, "https://instagram.com/example"),
                    ("Подписаться на YouTube", "yt", 1, "https://youtube.com/@example"),
                    ("Подписаться на канал", "tg", 1, "https://t.me/example2"),
                    ("Подписаться на канал", "tg", 1, "https://t.me/example3"),
                    ("Подписаться на IMac", "tg", 1, "https://t.me/example4"),
                ],
            )
            await db.commit()

        # Заполняем конкурсы
        cursor = await db.execute("SELECT COUNT(*) FROM contests")
        count = (await cursor.fetchone())[0]
        if count == 0:
            contests = [
                (json.dumps([{"emoji":"🧞","stars":5009},{"emoji":"👾","stars":2814},{"emoji":"👾","stars":2814}]), 12, 308),
                (json.dumps([{"emoji":"🌿","stars":2404},{"emoji":"🌿","stars":2404},{"emoji":"🧪","stars":1361}]), 12, 1200),
                (json.dumps([{"emoji":"🐻","stars":4653},{"emoji":"🎃","stars":1257},{"emoji":"🎃","stars":1257}]), 9, 3800),
            ]
            await db.executemany(
                "INSERT INTO contests (prizes_json, prize_count, participants) VALUES (?, ?, ?)",
                contests,
            )
            await db.commit()
