from fastapi import APIRouter
from app.utils.circuit_breaker import breaker_snapshot

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/breakers")
async def breakers():
    return {
        "service": "mobile-bff",
        "breakers": breaker_snapshot()
    }