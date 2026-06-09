import sys
from pathlib import Path

import grpc

from app.config import ITEM_GRPC_URL

generated_path = Path(__file__).resolve().parent.parent / "generated"
sys.path.append(str(generated_path))

import item_pb2
import item_pb2_grpc

def map_item(item):
    return {
        "id": item.id,
        "ownerId": item.owner_id,
        "name": item.name,
        "description": item.description,
        "category": item.category,
        "status": item.status,
        "location": item.location,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
    }


async def get_available_items():
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetAvailableItems(item_pb2.GetAvailableItemsRequest())
        return [map_item(item) for item in response.items]


async def get_items_by_category(category: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetItemsByCategory(
            item_pb2.GetItemsByCategoryRequest(category=category)
        )
        return [map_item(item) for item in response.items]


async def get_items_by_owner(owner_id: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetItemsByOwner(
            item_pb2.GetItemsByOwnerRequest(owner_id=owner_id)
        )
        return [map_item(item) for item in response.items]


async def get_item(item_id: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetItem(item_pb2.GetItemRequest(id=item_id))

        if not response.found:
            return None

        return map_item(response.item)


async def check_item_availability(item_id: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.CheckItemAvailability(
            item_pb2.CheckItemAvailabilityRequest(id=item_id)
        )
        return response.available