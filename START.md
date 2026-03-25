# CaseArena — Запуск

## 1. Настройка

Скопируй `.env.example` в `.env` и заполни:
```
BOT_TOKEN=токен от @BotFather
WEBAPP_URL=ссылка на фронтенд (после деплоя)
```

## 2. Бэкенд

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

API будет доступен на http://localhost:8000

## 3. Фронтенд (локально)

Просто открой `frontend/index.html` в браузере.
Или используй Live Server в VS Code.

## 4. Бот

```bash
pip install python-telegram-bot python-dotenv
python bot.py
```

## 5. Деплой

**Бэкенд** → Railway.app (бесплатно):
- Залей папку `backend/` на GitHub
- Подключи Railway, укажи `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Фронтенд** → Netlify (бесплатно):
- Залей папку `frontend/` на GitHub
- Подключи Netlify, укажи папку `frontend`
- После деплоя скопируй URL и вставь в `.env` как `WEBAPP_URL`

## Структура проекта

```
GorillaCaseBot/
├── frontend/          — Telegram Mini App (HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js     — Навигация, модалки, утилиты
│       ├── api.js     — API клиент + мок-данные
│       └── pages/
│           ├── cases.js    — Кейсы, PvP, Рулетка, Краш, Слоты, Яйца, Апгрейд
│           ├── contests.js — Конкурсы/Розыгрыши
│           ├── tasks.js    — Задания
│           ├── leaders.js  — Лидерборд
│           └── profile.js  — Профиль/Рефералы
├── backend/           — FastAPI сервер
│   ├── main.py
│   ├── database.py
│   ├── auth.py
│   └── routers/
│       ├── users.py
│       ├── cases.py
│       ├── pvp.py
│       ├── games.py   — Рулетка, Слоты, Яйца, Апгрейд
│       └── social.py  — Задания, Конкурсы, Рефералы, Лидерборд
└── bot.py             — Telegram бот
```
