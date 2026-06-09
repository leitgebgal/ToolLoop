import httpx
from app.config import RENTAL_SERVICE_URL


async def get_rentals_by_borrower(user_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{RENTAL_SERVICE_URL}/api/rentals/borrower/{user_id}")
        response.raise_for_status()
        return response.json()


async def get_rentals_by_owner(user_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{RENTAL_SERVICE_URL}/api/rentals/owner/{user_id}")
        response.raise_for_status()
        return response.json()


async def create_rental(payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{RENTAL_SERVICE_URL}/api/rentals", json=payload)
        response.raise_for_status()
        return response.json()


async def update_rental_status(rental_id: str, payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{RENTAL_SERVICE_URL}/api/rentals/{rental_id}/status",
            json=payload
        )
        response.raise_for_status()
        return response.json()


async def cancel_rental(rental_id: str, requester_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.delete(
            f"{RENTAL_SERVICE_URL}/api/rentals/{rental_id}",
            params={"requesterId": requester_id}
        )
        response.raise_for_status()
        return response.json()