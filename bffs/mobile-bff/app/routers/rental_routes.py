from fastapi import APIRouter, HTTPException, Query
import httpx

from app.clients import rental_client
from app.schemas.mobile_schemas import UpdateRentalStatusRequest

router = APIRouter(prefix="/api/mobile/rentals", tags=["Mobile Rentals"])


@router.get("/my/{user_id}")
async def my_rentals(user_id: str):
    try:
        as_borrower = await rental_client.get_rentals_by_borrower(user_id)
        as_owner = await rental_client.get_rentals_by_owner(user_id)

        return {
            "asBorrower": [
                {
                    "id": rental.get("id"),
                    "itemId": rental.get("itemId"),
                    "status": rental.get("status"),
                    "startDate": rental.get("startDate"),
                    "endDate": rental.get("endDate"),
                }
                for rental in as_borrower
            ],
            "asOwner": [
                {
                    "id": rental.get("id"),
                    "itemId": rental.get("itemId"),
                    "borrowerId": rental.get("borrowerId"),
                    "status": rental.get("status"),
                    "startDate": rental.get("startDate"),
                    "endDate": rental.get("endDate"),
                }
                for rental in as_owner
            ],
        }
    except httpx.HTTPStatusError as ex:
        raise HTTPException(
            status_code=ex.response.status_code,
            detail=ex.response.json()
        )


@router.patch("/{rental_id}/status")
async def update_status(rental_id: str, request: UpdateRentalStatusRequest):
    try:
        return await rental_client.update_rental_status(
            rental_id,
            request.model_dump(exclude_none=True)
        )
    except httpx.HTTPStatusError as ex:
        raise HTTPException(
            status_code=ex.response.status_code,
            detail=ex.response.json()
        )


@router.delete("/{rental_id}")
async def cancel_rental(rental_id: str, requesterId: str = Query(...)):
    try:
        return await rental_client.cancel_rental(rental_id, requesterId)
    except httpx.HTTPStatusError as ex:
        raise HTTPException(
            status_code=ex.response.status_code,
            detail=ex.response.json()
        )