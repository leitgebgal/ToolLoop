from fastapi import APIRouter, HTTPException

from app.clients import item_client
from app.clients import rental_client
from app.schemas.mobile_schemas import CreateMobileRentalRequest

router = APIRouter(prefix="/api/mobile/items", tags=["Mobile Items"])


@router.get("/available")
async def available_items():
    items = await item_client.get_available_items()

    return [
        {
            "id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "location": item["location"],
            "status": item["status"],
        }
        for item in items
    ]


@router.get("/category/{category}")
async def items_by_category(category: str):
    items = await item_client.get_items_by_category(category)

    return [
        {
            "id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "location": item["location"],
            "status": item["status"],
        }
        for item in items
    ]


@router.get("/{item_id}")
async def item_details(item_id: str):
    item = await item_client.get_item(item_id)

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return item


@router.post("/{item_id}/rentals")
async def create_rental_for_item(item_id: str, request: CreateMobileRentalRequest):
    item = await item_client.get_item(item_id)

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    available = await item_client.check_item_availability(item_id)

    if not available:
        raise HTTPException(status_code=409, detail="Item is not available")

    rental_payload = {
        "itemId": item_id,
        "borrowerId": request.borrowerId,
        "ownerId": item["ownerId"],
        "startDate": request.startDate,
        "endDate": request.endDate,
        "message": request.message,
    }

    try:
        rental = await rental_client.create_rental(rental_payload)

        return {
            "id": rental.get("id"),
            "itemId": rental.get("itemId"),
            "borrowerId": rental.get("borrowerId"),
            "ownerId": rental.get("ownerId"),
            "status": rental.get("status"),
            "startDate": rental.get("startDate"),
            "endDate": rental.get("endDate"),
        }
    except Exception as ex:
        raise HTTPException(status_code=502, detail=str(ex))