import httpx
from app.config import USER_SERVICE_URL
from app.utils.circuit_breaker import create_breaker


register_user_breaker = create_breaker("user.register")
login_user_breaker = create_breaker("user.login")
get_user_breaker = create_breaker("user.getUser")


async def _register_user(payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{USER_SERVICE_URL}/api/users/register", json=payload)
        response.raise_for_status()
        return response.json()


async def _login_user(payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{USER_SERVICE_URL}/api/users/login", json=payload)
        response.raise_for_status()
        return response.json()


async def _get_user(user_id: str, authorization: str | None = None):
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


async def register_user(payload: dict):
    return await register_user_breaker.call(_register_user, payload)


async def login_user(payload: dict):
    return await login_user_breaker.call(_login_user, payload)


async def get_user(user_id: str, authorization: str | None = None):
    return await get_user_breaker.call(_get_user, user_id, authorization)