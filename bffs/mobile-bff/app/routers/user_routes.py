from fastapi import APIRouter, Header, HTTPException
import httpx

from app.clients.user_client import get_user

router = APIRouter(prefix="/api/mobile/users", tags=["Mobile Users"])


@router.get("/{user_id}/profile")
async def get_mobile_profile(user_id: str, authorization: str | None = Header(default=None)):
    try:
        user = await get_user(user_id, authorization)

        return {
            "id": user.get("_id"),
            "name": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "city": user.get("city"),
            "isActive": user.get("isActive"),
        }
    except httpx.HTTPStatusError as ex:
        raise HTTPException(
            status_code=ex.response.status_code,
            detail=ex.response.json()
        )