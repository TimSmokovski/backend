import aiosqlite
import json
from datetime import datetime

DB_PATH = "./casearena.db"


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def get_setting(key: str, default=None):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = await cur.fetchone()
    return json.loads(row[0]) if row else default


async def set_setting(key: str, value):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value)),
        )
        await db.commit()


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
                free_case_at TEXT,
                photo_url   TEXT
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

            CREATE TABLE IF NOT EXISTS case_wins (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                emoji      TEXT NOT NULL,
                name       TEXT NOT NULL,
                stars      INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS pvp_rounds (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                status     TEXT DEFAULT 'active',
                winner_id  INTEGER,
                total_pot  INTEGER DEFAULT 0,
                started_at TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS pvp_bets (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                round_id   INTEGER NOT NULL,
                user_id    INTEGER NOT NULL,
                amount     INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
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

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS crash_bets (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                amount     INTEGER NOT NULL,
                round_id   INTEGER NOT NULL,
                status     TEXT DEFAULT 'active',
                won_amount INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
        await db.commit()

        # Миграция: добавляем photo_url если колонки ещё нет
        try:
            await db.execute("ALTER TABLE users ADD COLUMN photo_url TEXT")
            await db.commit()
        except Exception:
            pass

        # Миграция: добавляем banned если колонки ещё нет
        try:
            await db.execute("ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0")
            await db.commit()
        except Exception:
            pass

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

        # Рефанд незакрытых краш-ставок (сервер упал в середине раунда)
        cur = await db.execute(
            "SELECT user_id, SUM(amount) as total FROM crash_bets WHERE status = 'active' GROUP BY user_id"
        )
        stuck = await cur.fetchall()
        if stuck:
            for row in stuck:
                await db.execute(
                    "UPDATE users SET balance = balance + ? WHERE id = ?",
                    (row[1], row[0]),
                )
            await db.execute("UPDATE crash_bets SET status = 'refunded' WHERE status = 'active'")
            await db.commit()
