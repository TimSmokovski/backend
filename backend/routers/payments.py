import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
BOT_USERNAME = os.getenv("BOT_USERNAME", "")


@router.post("/create_invoice")
async def create_invoice(body: dict, user: dict = Depends(get_current_user)):
    amount = body.get("amount")
    if not isinstance(amount, int) or amount < 50 or amount > 100_000:
        raise HTTPException(status_code=400, detail="Сумма должна быть от 50 до 100 000")

    payload = f"{user['id']}:{amount}"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
            json={
                "title": f"Пополнение {amount} ⭐",
                "description": f"Пополнение баланса на {amount} звёзд в DC GalaxySpinBot",
                "payload": payload,
                "currency": "XTR",
                "prices": [{"label": f"{amount} звёзд", "amount": amount}],
            },
        )
        data = resp.json()

    if not data.get("ok"):
        raise HTTPException(status_code=502, detail=data.get("description", "Ошибка Telegram API"))

    return {"ok": True, "invoice_link": data["result"]}
