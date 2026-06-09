import httpx
from app.config import RENTAL_SERVICE_URL
from app.utils.circuit_breaker import create_breaker


def empty_list_fallback(*_args, **_kwargs):
    return []


get_rentals_by_borrower_breaker = create_breaker(
    "rental.getRentalsByBorrower",
    fallback=empty_list_fallback
)

get_rentals_by_owner_breaker = create_breaker(
    "rental.getRentalsByOwner",
    fallback=empty_list_fallback
)

create_rental_breaker = create_breaker("rental.createRental")
update_rental_status_breaker = create_breaker("rental.updateRentalStatus")
cancel_rental_breaker = create_breaker("rental.cancelRental")


async def _get_rentals_by_borrower(user_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{RENTAL_SERVICE_URL}/api/rentals/borrower/{user_id}")
        response.raise_for_status()
        return response.json()


async def _get_rentals_by_owner(user_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{RENTAL_SERVICE_URL}/api/rentals/owner/{user_id}")
        response.raise_for_status()
        return response.json()


async def _create_rental(payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{RENTAL_SERVICE_URL}/api/rentals", json=payload)
        response.raise_for_status()
        return response.json()


async def _update_rental_status(rental_id: str, payload: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{RENTAL_SERVICE_URL}/api/rentals/{rental_id}/status",
            json=payload
        )
        response.raise_for_status()
        return response.json()


async def _cancel_rental(rental_id: str, requester_id: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.delete(
            f"{RENTAL_SERVICE_URL}/api/rentals/{rental_id}",
            params={"requesterId": requester_id}
        )
        response.raise_for_status()
        return response.json()


async def get_rentals_by_borrower(user_id: str):
    return await get_rentals_by_borrower_breaker.call(_get_rentals_by_borrower, user_id)


async def get_rentals_by_owner(user_id: str):
    return await get_rentals_by_owner_breaker.call(_get_rentals_by_owner, user_id)


async def create_rental(payload: dict):
    return await create_rental_breaker.call(_create_rental, payload)


async def update_rental_status(rental_id: str, payload: dict):
    return await update_rental_status_breaker.call(
        _update_rental_status,
        rental_id,
        payload
    )


async def cancel_rental(rental_id: str, requester_id: str):
    return await cancel_rental_breaker.call(_cancel_rental, rental_id, requester_id)