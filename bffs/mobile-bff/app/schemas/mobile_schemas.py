from pydantic import BaseModel
from typing import Optional


class RegisterRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    password: str
    phone: Optional[str] = None
    city: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateMobileRentalRequest(BaseModel):
    borrowerId: str
    startDate: str
    endDate: str
    message: Optional[str] = None


class UpdateRentalStatusRequest(BaseModel):
    status: str
    rejectionReason: Optional[str] = None