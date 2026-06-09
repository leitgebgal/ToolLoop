from fastapi import APIRouter, HTTPException
import httpx

from app.clients.user_client import register_user, login_user
from app.schemas.mobile_schemas import RegisterRequest, LoginRequest

router = APIRouter(prefix="/api/mobile/auth", tags=["Mobile Auth"])


@router.post("/register")
async def register(request: RegisterRequest):
    try:
        return await register_user(request.model_dump(exclude_none=True))
    except httpx.HTTPStatusError as ex:
        raise HTTPException(
            status_code=ex.response.status_code,
            detail=ex.response.json()
        )


@router.post("/login")
async def login(request: LoginRequest):
    try:
        return await login_user(request.model_dump())
    except httpx.HTTPStatusError as ex:
        raise HTTPException(
            status_code=ex.response.status_code,
            detail=ex.response.json()
        )