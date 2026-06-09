import httpx
from app.config import USER_SERVICE_URL


async def register_user(payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{USER_SERVICE_URL}/api/users/register", json=payload)
        response.raise_for_status()
        return response.json()


async def login_user(payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{USER_SERVICE_URL}/api/users/login", json=payload)
        response.raise_for_status()
        return response.json()


async def get_user(user_id: str, authorization: str | None = None):
    headers = {}

    if authorization:
        headers["Authorization"] = authorization

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{USER_SERVICE_URL}/api/users/{user_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()