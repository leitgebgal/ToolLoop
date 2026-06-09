from fastapi import APIRouter

from app.clients import item_client
from app.clients import rental_client

router = APIRouter(prefix="/api/mobile/feed", tags=["Mobile Feed"])


@router.get("/{user_id}")
async def mobile_feed(user_id: str):
    available_items = await item_client.get_available_items()
    borrower_rentals = await rental_client.get_rentals_by_borrower(user_id)
    owner_rentals = await rental_client.get_rentals_by_owner(user_id)

    return {
        "availableItems": [
            {
                "id": item["id"],
                "name": item["name"],
                "category": item["category"],
                "location": item["location"],
            }
            for item in available_items[:10]
        ],
        "myRentalSummary": {
            "asBorrowerCount": len(borrower_rentals),
            "asOwnerCount": len(owner_rentals),
            "pendingAsOwnerCount": len([
                rental for rental in owner_rentals
                if rental.get("status") == "Pending"
            ]),
        },
        "latestBorrowedRentals": [
            {
                "id": rental.get("id"),
                "itemId": rental.get("itemId"),
                "status": rental.get("status"),
            }
            for rental in borrower_rentals[:5]
        ],
        "latestOwnerRequests": [
            {
                "id": rental.get("id"),
                "itemId": rental.get("itemId"),
                "borrowerId": rental.get("borrowerId"),
                "status": rental.get("status"),
            }
            for rental in owner_rentals[:5]
        ],
    }