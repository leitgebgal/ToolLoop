import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "8082"))

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:3000")
RENTAL_SERVICE_URL = os.getenv("RENTAL_SERVICE_URL", "http://localhost:5000")
ITEM_GRPC_URL = os.getenv("ITEM_GRPC_URL", "localhost:50051")
ITEM_HTTP_URL = os.getenv("ITEM_HTTP_URL", "http://localhost:8080")