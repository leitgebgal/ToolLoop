from datetime import datetime, timezone
import httpx

from app.config import USER_SERVICE_URL, RENTAL_SERVICE_URL, ITEM_HTTP_URL


async def check_http_service(name: str, url: str):
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            response = await client.get(url)

        return {
            "name": name,
            "status": "UP" if 200 <= response.status_code < 300 else "DOWN",
            "details": response.json()
        }

    except Exception as ex:
        return {
            "name": name,
            "status": "DOWN",
            "error": str(ex)
        }


async def readiness():
    checks = [
        await check_http_service("user-service", f"{USER_SERVICE_URL}/health"),
        await check_http_service("item-service", f"{ITEM_HTTP_URL}/health"),
        await check_http_service("rental-service", f"{RENTAL_SERVICE_URL}/health"),
    ]

    status = "UP" if all(check["status"] == "UP" for check in checks) else "DEGRADED"

    return {
        "service": "mobile-bff",
        "status": status,
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }