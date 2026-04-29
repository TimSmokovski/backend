# LkStars — Deploy на VPS

Готовая папка для разворачивания на сервере (Ubuntu / Debian).

## Что внутри

```
deploy/
├── backend/              FastAPI + uvicorn
├── frontend/             Telegram Mini App (статика)
├── .env                  переменные окружения (правишь под себя)
├── Dockerfile            образ для бэкенда
├── docker-compose.yml    backend + nginx
├── nginx.conf            конфиг веб-сервера
└── README.md             этот файл
```

---

## Шаг 1. Закинуть папку на сервер

С локального компа:
```bash
scp -r deploy/ root@<IP_СЕРВЕРА>:/opt/lkstars
```
(или через `rsync`, `git clone`, FTP — как удобно)

Зайти на сервер:
```bash
ssh root@<IP_СЕРВЕРА>
cd /opt/lkstars
```

## Шаг 2. Поставить Docker (если ещё нет)

```bash
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

## Шаг 3. Настроить `.env`

Открыть `.env` и заменить:
- `BACKEND_URL` — домен сервера, например `https://lkstars.example.com` (или `http://<IP>` если без домена)
- `WEBAPP_URL` — туда же, где будет открываться Mini App

`BOT_TOKEN`, `ADMIN_IDS`, `BOT_USERNAME` уже заполнены.

## Шаг 4. Прописать адрес API во фронте

Файл `frontend/js/config.js` — заменить `API_BASE` на адрес сервера:
```js
const CONFIG = {
  API_BASE: 'https://lkstars.example.com'   // или http://<IP>
};
```

## Шаг 5. Добавить свой домен в CORS бэка (если есть)

`backend/main.py`, в списке `allow_origins` добавить строку:
```python
"https://lkstars.example.com",
```
(если используешь только IP без домена — этот шаг можно пропустить, regex для ngrok всё равно отработает; либо добавить `http://<IP>`)

## Шаг 6. Запуск

```bash
docker compose up -d --build
```

Проверка:
```bash
docker compose ps
docker compose logs -f backend
```

Открыть в браузере: `http://<IP_СЕРВЕРА>/` — должна загрузиться Mini App.
API: `http://<IP_СЕРВЕРА>/users/...` (через nginx прокси).

## Шаг 7. Webhook бота

Бэкенд при старте сам ставит вебхук на `BACKEND_URL/telegram/webhook`.
**Telegram требует HTTPS для вебхука** — без SSL бот не заработает.

## Шаг 8. SSL (HTTPS) — обязательно для бота

Самый простой путь — через `certbot` на хосте + проброс сертификатов в nginx-контейнер.

```bash
apt install -y certbot
docker compose stop nginx
certbot certonly --standalone -d lkstars.example.com
mkdir -p certs
cp /etc/letsencrypt/live/lkstars.example.com/fullchain.pem certs/
cp /etc/letsencrypt/live/lkstars.example.com/privkey.pem certs/
```

Затем в `docker-compose.yml` раскомментировать `443:443` и volume `./certs:/etc/nginx/certs:ro`,
в `nginx.conf` — раскомментировать SSL-блок (внизу файла).

Перезапустить:
```bash
docker compose up -d
```

## Шаг 9. В BotFather

`/setdomain` → указать `https://lkstars.example.com`
`/mybots → Bot Settings → Menu Button` → URL = `https://lkstars.example.com`

---

## Полезные команды

```bash
docker compose logs -f backend     # логи бэка
docker compose logs -f nginx       # логи nginx
docker compose restart backend     # рестарт бэка
docker compose down                # остановить всё
docker compose up -d --build       # пересобрать после правок кода
```

## База данных

SQLite (`casearena.db`) лежит внутри контейнера. Чтобы данные сохранялись между пересборками,
файл маунтится через volume `./data` (см. `docker-compose.yml`). При первом запуске БД создаётся автоматически.

Если нужен бэкап:
```bash
docker cp lkstars-backend:/app/backend/casearena.db ./casearena.db.backup
```

---

## Без Docker (если очень надо)

```bash
apt install -y python3-pip nginx
cd /opt/lkstars/backend
pip install -r requirements.txt
# скопировать nginx.conf в /etc/nginx/sites-available/lkstars и включить
# запустить через systemd (см. ниже)
```

systemd unit `/etc/systemd/system/lkstars.service`:
```
[Unit]
Description=LkStars backend
After=network.target

[Service]
WorkingDirectory=/opt/lkstars/backend
EnvironmentFile=/opt/lkstars/.env
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
systemctl enable --now lkstars
```
