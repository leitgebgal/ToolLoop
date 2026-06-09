import sys
from pathlib import Path

import grpc

from app.config import ITEM_GRPC_URL
from app.utils.circuit_breaker import create_breaker

generated_path = Path(__file__).resolve().parent.parent / "generated"
sys.path.append(str(generated_path))

import item_pb2
import item_pb2_grpc


def empty_list_fallback(*_args, **_kwargs):
    return []


def unavailable_fallback(*_args, **_kwargs):
    return False


get_available_items_breaker = create_breaker(
    "item.getAvailableItems",
    fallback=empty_list_fallback
)

get_items_by_category_breaker = create_breaker(
    "item.getItemsByCategory",
    fallback=empty_list_fallback
)

get_items_by_owner_breaker = create_breaker(
    "item.getItemsByOwner",
    fallback=empty_list_fallback
)

get_item_breaker = create_breaker("item.getItem")

check_item_availability_breaker = create_breaker(
    "item.checkItemAvailability",
    fallback=unavailable_fallback
)


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


async def _get_available_items():
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetAvailableItems(item_pb2.GetAvailableItemsRequest())
        return [map_item(item) for item in response.items]


async def _get_items_by_category(category: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetItemsByCategory(
            item_pb2.GetItemsByCategoryRequest(category=category)
        )
        return [map_item(item) for item in response.items]


async def _get_items_by_owner(owner_id: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetItemsByOwner(
            item_pb2.GetItemsByOwnerRequest(owner_id=owner_id)
        )
        return [map_item(item) for item in response.items]


async def _get_item(item_id: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.GetItem(item_pb2.GetItemRequest(id=item_id))

        if not response.found:
            return None

        return map_item(response.item)


async def _check_item_availability(item_id: str):
    async with grpc.aio.insecure_channel(ITEM_GRPC_URL) as channel:
        stub = item_pb2_grpc.ItemServiceStub(channel)
        response = await stub.CheckItemAvailability(
            item_pb2.CheckItemAvailabilityRequest(id=item_id)
        )
        return response.available


async def get_available_items():
    return await get_available_items_breaker.call(_get_available_items)


async def get_items_by_category(category: str):
    return await get_items_by_category_breaker.call(_get_items_by_category, category)


async def get_items_by_owner(owner_id: str):
    return await get_items_by_owner_breaker.call(_get_items_by_owner, owner_id)


async def get_item(item_id: str):
    return await get_item_breaker.call(_get_item, item_id)


async def check_item_availability(item_id: str):
    return await check_item_availability_breaker.call(
        _check_item_availability,
        item_id
    )