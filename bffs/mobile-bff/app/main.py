from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth_routes
from app.routers import user_routes
from app.routers import item_routes
from app.routers import rental_routes
from app.routers import feed_routes

app = FastAPI(
    title="ToolLoop Mobile BFF",
    version="1.0.0",
    description="Mobile Backend for Frontend API Gateway for ToolLoop"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "service": "mobile-bff",
        "status": "UP"
    }


app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(item_routes.router)
app.include_router(rental_routes.router)
app.include_router(feed_routes.router)